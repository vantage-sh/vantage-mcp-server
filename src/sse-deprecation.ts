import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger";

const NOTICE_ATTEMPTED_KEY = "sseDeprecationNoticeAttempted";

export function sseDeprecationMessage(mcpUrl: string): string {
  return `The Vantage legacy SSE connection is deprecated. Update your MCP client configuration to use ${mcpUrl} with Streamable HTTP. Your existing connection will continue working during the 60-day migration window. The legacy SSE endpoint will be retired on November 30, 2026.`;
}

export function createHostedMcpServer(
  serverInfo: Implementation,
  options: {
    transportType: string;
    mcpUrl: string;
    storage: Pick<DurableObjectStorage, "get" | "put">;
    waitUntil: (promise: Promise<unknown>) => void;
  }
): McpServer {
  if (options.transportType !== "sse") {
    return new McpServer(serverInfo);
  }

  const message = sseDeprecationMessage(options.mcpUrl);
  const server = new McpServer(serverInfo, {
    capabilities: { logging: {} },
    instructions: message,
  });
  let noticeScheduled = false;

  server.server.oninitialized = () => {
    if (noticeScheduled) return;
    noticeScheduled = true;

    options.waitUntil(
      (async () => {
        // Durable Objects can hibernate between messages. Remember the attempt
        // before sending so restarts, filtering, or delivery failures do not spam clients.
        if (await options.storage.get<boolean>(NOTICE_ATTEMPTED_KEY)) return;
        await options.storage.put(NOTICE_ATTEMPTED_KEY, true);
        await server.sendLoggingMessage({ level: "warning", logger: "vantage.sse-deprecation", data: message });
      })().catch(() => {
        // A notice is best effort and must never break initialization or tool calls.
        logger.warn("Unable to deliver legacy SSE deprecation notice");
      })
    );
  };

  return server;
}

/** Only an explicit, same-origin OAuth resource identifies the legacy transport. */
export function isLegacySseResource(resource: string | string[] | undefined, authorizationUrl: string): boolean {
  const origin = new URL(authorizationUrl).origin;
  const resources = Array.isArray(resource) ? resource : resource ? [resource] : [];
  return resources.some((value) => {
    try {
      const url = new URL(value);
      return url.origin === origin && (url.pathname === "/sse" || url.pathname.startsWith("/sse/"));
    } catch {
      return false;
    }
  });
}
