import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { type CoreCredentialProps, callCoreApi, coreApiHeaders } from "../core-api";
import type { AppEnv } from "../env";
import setupRegisteredResources from "../resources";
import { serverMeta } from "../shared";
import { ACCESS_POLICY_TOOL_NAMES, hideAccessPolicyToolsFromNonOwners } from "../tools/access-policies/gating";
import { setupRegisteredTools, type ToolCallContext } from "../tools/structure/registerTool";
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

// This handler runs behind the authentication provider. Credentials come only
// from its validated props (or the existing development token override).
export const statelessMcpHandler: McpApiHandler = {
  async fetch(request, env, executionCtx) {
    // Capture credentials per HTTP exchange. No principal, server, or transport
    // is cached in module state or stored in a Durable Object.
    const headers = coreApiHeaders(executionCtx.props as CoreCredentialProps | undefined, env);
    if (!headers) return new Response("Unauthorized", { status: 401 });

    const parsedBody = await readJsonRpcBody(request);
    const checkOwner = needsOwnerCheck(parsedBody);
    const handler = createMcpHandler(
      async () => {
        const server = new McpServer(serverMeta);
        const context: ToolCallContext = {
          env,
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

/** Serves /mcp statelessly when MCP_STATELESS_ENABLED is set; /sse keeps its McpAgent handler. */
export function withStatelessMcp(legacy: McpApiHandler): McpApiHandler {
  return {
    fetch(request, env, ctx) {
      return (env.MCP_STATELESS_ENABLED === "true" ? statelessMcpHandler : legacy).fetch(request, env, ctx);
    },
  };
}
