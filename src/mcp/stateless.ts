import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { type CoreCredentialProps, callCoreApi, coreApiHeaders } from "../core-api";
import type { AppEnv } from "../env";
import setupRegisteredResources from "../resources";
import { serverMeta } from "../shared";
import { ACCESS_POLICY_TOOL_NAMES, hideAccessPolicyToolsFromNonOwners } from "../tools/access-policies/gating";
import { getRegisteredTools, setupRegisteredTools, type ToolCallContext } from "../tools/structure/registerTool";
import { createMutationConfirmation, sha256Hex } from "./confirm-mutation";
import { CONFIRMATION_HEADER, parseConfirmationPolicy } from "./confirmation-policy";
import "../tools";

export type McpApiHandler = {
  fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Response | Promise<Response>;
};

type JsonRpcMessage = { method?: unknown; params?: { name?: unknown } };

async function readJsonRpcBody(request: Request): Promise<unknown> {
  if (request.method !== "POST") return undefined;
  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
}

/**
 * Only tool listings and Access Policy calls depend on account ownership.
 * Unparseable bodies are treated as needing the check so the gate fails closed.
 */
function needsOwnerCheck(body: unknown): boolean {
  if (body === undefined) return true;
  const messages = (Array.isArray(body) ? body : [body]) as JsonRpcMessage[];
  return messages.some(
    (message) =>
      message?.method === "tools/list" ||
      (message?.method === "tools/call" && ACCESS_POLICY_TOOL_NAMES.includes(message.params?.name as string))
  );
}

/**
 * Signed confirmation state is bound to the OAuth user rather than the bearer
 * token, so a token refresh between challenge and approval does not void it.
 * Other credentials are bound by digest.
 */
async function confirmationPrincipal(
  env: AppEnv,
  props: CoreCredentialProps | undefined,
  headers: Record<string, string>
): Promise<string> {
  const subject = env.VANTAGE_MCP_TOKEN ? undefined : props?.claims?.sub;
  if (subject) return JSON.stringify([env.VANTAGE_API_HOST, "user", subject]);
  const credential = await sha256Hex(JSON.stringify(Object.entries(headers).sort()));
  return JSON.stringify([env.VANTAGE_API_HOST, "credential", credential]);
}

// This handler runs behind the authentication provider. Credentials come only
// from its validated props (or the existing development token override).
export const statelessMcpHandler: McpApiHandler = {
  async fetch(request, env, executionCtx) {
    // Capture credentials per HTTP exchange. No principal, server, or transport
    // is cached in module state or stored in a Durable Object.
    const props = executionCtx.props as CoreCredentialProps | undefined;
    const headers = coreApiHeaders(props, env);
    if (!headers) return new Response("Unauthorized", { status: 401 });
    let policy: ReturnType<typeof parseConfirmationPolicy>;
    try {
      policy = parseConfirmationPolicy(request.headers.get(CONFIRMATION_HEADER), getRegisteredTools());
    } catch (error) {
      return new Response((error as Error).message, { status: 400 });
    }
    if (policy.selectors.size && new TextEncoder().encode(env.MCP_CONFIRMATION_SECRET ?? "").length < 32) {
      return new Response("Confirmations require a configured MCP_CONFIRMATION_SECRET of at least 32 bytes.", {
        status: 503,
      });
    }

    const principal = policy.selectors.size ? await confirmationPrincipal(env, props, headers) : "";
    const parsedBody = await readJsonRpcBody(request);
    const checkOwner = needsOwnerCheck(parsedBody);
    const handler = createMcpHandler(
      async () => {
        const confirmation = policy.selectors.size
          ? createMutationConfirmation({
              policy,
              key: env.MCP_CONFIRMATION_SECRET!,
              principal,
              clientCapabilities: () => server.server.getClientCapabilities(),
            })
          : undefined;
        const server: McpServer = new McpServer(serverMeta, confirmation?.serverOptions);
        const context: ToolCallContext = {
          env,
          confirmMutation: confirmation?.confirm,
          waitUntil: (promise) => executionCtx.waitUntil(promise),
          callVantageApi: (endpoint, params, method, signal) =>
            callCoreApi(
              env,
              headers,
              server.server.getClientVersion(),
              endpoint,
              params,
              method,
              signal ? AbortSignal.any([signal, request.signal]) : request.signal
            ),
        };
        const tools = setupRegisteredTools(server, () => context);
        setupRegisteredResources(server);
        if (checkOwner) await hideAccessPolicyToolsFromNonOwners(tools, context);
        return server;
      },
      { legacy: "stateless" }
    );
    // Keep the handler alive until the response is consumed; closing it here
    // would abort streamed results. The SDK owns per-request server teardown.
    return handler.fetch(request, parsedBody === undefined ? undefined : { parsedBody });
  },
};

/** The McpAgent handlers cannot elicit, so requested confirmations are refused rather than ignored. */
export function withoutConfirmations(legacy: McpApiHandler): McpApiHandler {
  return {
    fetch(request, env, ctx) {
      if (request.headers.has(CONFIRMATION_HEADER)) {
        try {
          const policy = parseConfirmationPolicy(request.headers.get(CONFIRMATION_HEADER), getRegisteredTools());
          if (policy.selectors.size)
            return new Response("Requested confirmations require the stateless SDK v2 /mcp endpoint.", { status: 503 });
        } catch (error) {
          return new Response((error as Error).message, { status: 400 });
        }
      }
      return legacy.fetch(request, env, ctx);
    },
  };
}

/** Serves /mcp statelessly when MCP_STATELESS_ENABLED is set; /sse keeps its McpAgent handler. */
export function withStatelessMcp(legacy: McpApiHandler): McpApiHandler {
  const guarded = withoutConfirmations(legacy);
  return {
    fetch(request, env, ctx) {
      return (env.MCP_STATELESS_ENABLED === "true" ? statelessMcpHandler : guarded).fetch(request, env, ctx);
    },
  };
}
