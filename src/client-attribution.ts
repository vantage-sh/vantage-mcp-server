import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger";
import { datadogTraceLogTags, tracer } from "./tracing";

type RawRequestHandler = (
  request: unknown,
  extra: { requestInfo?: { headers?: Record<string, string | string[] | undefined> } }
) => Promise<unknown>;

/**
 * Logs the client name, version, and transport once per MCP initialization, so
 * sessions that never call a tool (and therefore never reach `callVantageApi`)
 * can still be attributed.
 *
 * Logs from the `initialize` request rather than `oninitialized`: the SDK
 * calls notification handlers without `requestInfo`, so only the request
 * carries the Worker's forwarded `traceparent` for trace correlation. The SDK
 * has no public way to wrap a built-in handler, so this wraps the registered
 * one and leaves its behavior unchanged.
 */
export function logClientInitialization(server: McpServer, transportType: string): void {
  const handlers = (server.server as unknown as { _requestHandlers?: Map<string, RawRequestHandler> })._requestHandlers;
  const initialize = handlers?.get("initialize");
  if (!handlers || !initialize) return;

  handlers.set("initialize", async (request, extra) => {
    const result = await initialize(request, extra);
    try {
      const client = server.server.getClientVersion();
      const headers = extra?.requestInfo?.headers as HeadersInit | undefined;
      logger
        .withTags({
          mcp_transport: transportType,
          mcp_client_name: client?.name,
          mcp_client_version: client?.version,
          ...datadogTraceLogTags(tracer.extractTraceContext(headers ? new Headers(headers) : undefined)),
        })
        .info("MCP client initialized");
    } catch {
      // Attribution is best effort and must never break initialization.
    }
    return result;
  });
}
