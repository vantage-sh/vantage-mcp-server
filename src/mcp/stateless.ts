import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import { withLogTags } from "workers-tagged-logger";
import type { UserProps } from "../auth";
import type { AppEnv } from "../env";
import { logger } from "../logger";
import setupRegisteredResources from "../resources";
import { callApi, serverMeta } from "../shared";
import { hideAccessPolicyToolsFromNonOwners } from "../tools/access-policies/gating";
import { getRegisteredToolNames, setupRegisteredTools, type ToolCallContext } from "../tools/structure/registerTool";
import { datadogTraceLogTags, formatErrorsForTelemetry, tracer } from "../tracing";
import { createMutationConfirmation } from "./confirm-mutation";
import { CONFIRMATION_HEADER, parseConfirmationPolicy } from "./confirmation-policy";
import "../tools";

export type McpApiHandler = {
  fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Response | Promise<Response>;
};

// This handler runs behind the authentication provider. Credentials come only
// from its validated props (or the existing development token override).
export const statelessMcpHandler: McpApiHandler = {
  async fetch(request, env, executionCtx) {
    const props = executionCtx.props as UserProps & { vantageHeaders?: Record<string, string> };
    const token = env.VANTAGE_MCP_TOKEN || props?.tokenSet?.accessToken;
    const vantageHeaders = props?.vantageHeaders ?? {};
    if (!token && Object.keys(vantageHeaders).length === 0) return new Response("Unauthorized", { status: 401 });
    let policy: ReturnType<typeof parseConfirmationPolicy>;
    try {
      policy = parseConfirmationPolicy(request.headers.get(CONFIRMATION_HEADER), getRegisteredToolNames());
    } catch (error) {
      return new Response((error as Error).message, { status: 400 });
    }
    if (policy.selectors.size && new TextEncoder().encode(env.MCP_CONFIRMATION_SECRET ?? "").length < 32) {
      return new Response("Confirmations require a configured MCP_CONFIRMATION_SECRET of at least 32 bytes.", {
        status: 503,
      });
    }

    // Capture credentials per HTTP exchange. No principal, server, or transport
    // is cached in module state or stored in a Durable Object.
    const headers = { ...vantageHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const handler = createMcpHandler(
      async () => {
        const confirmation = policy.selectors.size
          ? createMutationConfirmation({
              policy,
              key: env.MCP_CONFIRMATION_SECRET!,
              principal: JSON.stringify([env.VANTAGE_API_HOST, headers]),
              clientCapabilities: () => server.server.getClientCapabilities(),
            })
          : undefined;
        const server: McpServer = new McpServer(serverMeta, confirmation?.serverOptions);
        const context: ToolCallContext = {
          env,
          signal: request.signal,
          confirmMutation: confirmation?.confirm,
          waitUntil: (promise) => executionCtx.waitUntil(promise),
          callVantageApi: <
            P extends Path,
            M extends SupportedMethods<P>,
            ApiRequest extends RequestBodyForPathAndMethod<P, M>,
            ApiResponse extends ResponseBodyForPathAndMethod<P, M>,
          >(
            endpoint: P,
            params: ApiRequest,
            method: M,
            signal?: AbortSignal
          ) =>
            withLogTags({}, async () => {
              const client = server.server.getClientVersion();
              logger.setTags({
                endpoint,
                method,
                ...(client ? { mcp_client_name: client.name, mcp_client_version: client.version } : {}),
                ...datadogTraceLogTags(tracer.getActiveTraceContext()),
              });
              const apiSignal = signal ? AbortSignal.any([signal, request.signal]) : request.signal;
              apiSignal.throwIfAborted();
              const result = await callApi<P, M, ApiRequest, ApiResponse>(
                env.VANTAGE_API_HOST,
                headers,
                params,
                method,
                endpoint,
                env,
                apiSignal
              );
              logger.setTags({ ok: result.ok, ...datadogTraceLogTags(tracer.getActiveTraceContext()) });
              if (!result.ok) {
                logger.setTags({ api_errors: formatErrorsForTelemetry(result.errors) });
                logger.error("Vantage API request failed");
              } else logger.info("Vantage API request");
              return result;
            }),
        };
        const tools = setupRegisteredTools(server, () => context);
        setupRegisteredResources(server);
        await hideAccessPolicyToolsFromNonOwners(tools, context);
        return server;
      },
      { legacy: "stateless" }
    );
    // Keep the handler alive until the response is consumed; closing it here
    // would abort streamed results. The SDK owns per-request server teardown.
    return handler.fetch(request);
  },
};

export function selectMcpApiHandler(sse: boolean, env: AppEnv, legacy: McpApiHandler): McpApiHandler {
  if (!sse && env.MCP_STATELESS_ENABLED === "true") return statelessMcpHandler;
  return {
    fetch(request, legacyEnv, context) {
      if (request.headers.has(CONFIRMATION_HEADER)) {
        try {
          const policy = parseConfirmationPolicy(request.headers.get(CONFIRMATION_HEADER), getRegisteredToolNames());
          if (policy.selectors.size)
            return new Response("Requested confirmations require the stateless SDK v2 /mcp endpoint.", { status: 503 });
        } catch (error) {
          return new Response((error as Error).message, { status: 400 });
        }
      }
      return legacy.fetch(request, legacyEnv, context);
    },
  };
}
