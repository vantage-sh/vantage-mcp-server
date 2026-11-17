import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logClientInitialization } from "../src/client-attribution";
import { logger } from "../src/logger";
import { createHostedMcpServer } from "../src/sse-deprecation";

const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  vi.restoreAllMocks();
});

function spyOnInitializationLogs() {
  const info = vi.fn();
  const withTags = vi.spyOn(logger, "withTags").mockReturnValue({ info } as unknown as typeof logger);
  return { info, withTags };
}

async function connect(transportType: string, requestHeaders?: Record<string, string>) {
  const background: Promise<unknown>[] = [];
  const server = createHostedMcpServer(
    { name: "Vantage test", version: "1.0.0" },
    {
      transportType,
      mcpUrl: "https://hosted-mcp-staging.vantage.sh/mcp",
      storage: { get: vi.fn(async () => undefined), put: vi.fn(async () => undefined) },
      waitUntil: (promise) => background.push(promise),
    }
  );
  logClientInitialization(server, transportType);
  server.registerTool("connection-check", {}, async () => ({ content: [{ type: "text", text: "Connected" }] }));
  const client = new Client({ name: "attribution-client", version: "4.5.6" });
  clients.push(client);
  const warnings: unknown[] = [];
  client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    warnings.push(notification.params);
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  if (requestHeaders) {
    // Mimic the Worker forwarding request headers into the Durable Object.
    const onmessage = serverTransport.onmessage;
    serverTransport.onmessage = (message, extra) =>
      onmessage?.(message, { ...extra, requestInfo: { headers: requestHeaders } });
  }
  await client.connect(clientTransport);
  await Promise.all(background);
  return { client, warnings };
}

describe("MCP client initialization attribution", () => {
  it.each(["streamable-http", "sse"])(
    "logs client name, version, and %s transport once per initialization",
    async (transport) => {
      const { info, withTags } = spyOnInitializationLogs();
      const { client } = await connect(transport);
      await client.callTool({ name: "connection-check" });

      expect(withTags).toHaveBeenCalledTimes(1);
      expect(withTags.mock.calls[0][0]).toMatchObject({
        mcp_transport: transport,
        mcp_client_name: "attribution-client",
        mcp_client_version: "4.5.6",
      });
      expect(info).toHaveBeenCalledWith("MCP client initialized");
    }
  );

  it("tags the log with the trace forwarded on the initialize request", async () => {
    const { withTags } = spyOnInitializationLogs();
    const traceId = "012045e13ff5466d621637c8ee2b3266";
    const spanId = "4f9c1a2b3c4d5e6f";
    await connect("sse", { traceparent: `00-${traceId}-${spanId}-01` });

    expect(withTags).toHaveBeenCalledTimes(1);
    expect(withTags.mock.calls[0][0]).toMatchObject({
      trace_id: traceId,
      span_id: spanId,
      "dd.trace_id": BigInt(`0x${traceId.slice(-16)}`).toString(),
      "dd.span_id": BigInt(`0x${spanId}`).toString(),
    });
  });

  it("keeps the SSE deprecation warning", async () => {
    spyOnInitializationLogs();
    const { warnings } = await connect("sse");
    expect(warnings).toEqual([expect.objectContaining({ logger: "vantage.sse-deprecation" })]);
  });

  it("does not break initialization or tool calls when logging throws", async () => {
    vi.spyOn(logger, "withTags").mockImplementation(() => {
      throw new Error("logger unavailable");
    });
    const { client } = await connect("streamable-http");
    const result = await client.callTool({ name: "connection-check" });
    expect(result.content).toEqual([{ type: "text", text: "Connected" }]);
  });
});
