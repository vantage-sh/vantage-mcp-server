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
import { setupRegisteredTools, type ToolCallContext } from "../tools/structure/registerTool";
import { datadogTraceLogTags, formatErrorsForTelemetry, tracer } from "../tracing";
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

    // Capture credentials per HTTP exchange. No principal, server, or transport
    // is cached in module state or stored in a Durable Object.
    const headers = { ...vantageHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const handler = createMcpHandler(
      async () => {
        const server = new McpServer(serverMeta);
        const context: ToolCallContext = {
          env,
          signal: request.signal,
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
  return !sse && env.MCP_STATELESS_ENABLED === "true" ? statelessMcpHandler : legacy;
}
