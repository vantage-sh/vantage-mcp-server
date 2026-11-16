import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger";
import { datadogTraceLogTags, tracer } from "./tracing";

/**
 * Logs the client name, version, and transport once per MCP initialization, so
 * sessions that never call a tool (and therefore never reach `callVantageApi`)
 * can still be attributed. Chains any existing `oninitialized` handler.
 */
export function logClientInitialization(server: McpServer, transportType: string): void {
  const previous = server.server.oninitialized;
  server.server.oninitialized = () => {
    previous?.();
    try {
      const client = server.server.getClientVersion();
      logger
        .withTags({
          mcp_transport: transportType,
          mcp_client_name: client?.name,
          mcp_client_version: client?.version,
          ...datadogTraceLogTags(tracer.getActiveTraceContext()),
        })
        .info("MCP client initialized");
    } catch {
      // Attribution is best effort and must never break initialization.
    }
  };
}
