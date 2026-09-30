import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../src/logger";
import { createHostedMcpServer, isLegacySseResource } from "../src/sse-deprecation";

function sessionStorage() {
  const values = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => values.get(key)),
    put: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  };
}

const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  vi.restoreAllMocks();
});

function setup(transportType = "sse", storage = sessionStorage()) {
  const background: Promise<unknown>[] = [];
  const server = createHostedMcpServer(
    { name: "Vantage test", version: "1.0.0" },
    {
      transportType,
      mcpUrl: "https://hosted-mcp-staging.vantage.sh/mcp",
      storage: storage as unknown as Pick<DurableObjectStorage, "get" | "put">,
      waitUntil: (promise) => background.push(promise),
    }
  );
  server.registerTool("connection-check", {}, async () => ({ content: [{ type: "text", text: "Connected" }] }));
  const client = new Client({ name: "test-client", version: "1.0.0" });
  clients.push(client);
  const warnings: unknown[] = [];
  client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    warnings.push(notification.params);
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  return {
    client,
    server,
    storage,
    background,
    warnings,
    async connect() {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
    },
  };
}

describe("SSE deprecation notices", () => {
  it("advertises logging and migration instructions, then warns once after initialization", async () => {
    const session = setup();
    const initialized = vi.spyOn(session.client, "notification").mockResolvedValueOnce(undefined);
    await session.connect();

    expect(session.warnings).toEqual([]);
    expect(session.background).toEqual([]);
    expect(session.storage.get).not.toHaveBeenCalled();
    initialized.mockRestore();
    await session.client.notification({ method: "notifications/initialized" });
    await Promise.all(session.background);

    expect(session.client.getServerCapabilities()?.logging).toEqual({});
    expect(session.client.getInstructions()).toContain("https://hosted-mcp-staging.vantage.sh/mcp");
    expect(session.client.getInstructions()).toContain("Streamable HTTP");
    expect(session.warnings).toEqual([
      {
        level: "warning",
        logger: "vantage.sse-deprecation",
        data: session.client.getInstructions(),
      },
    ]);

    await session.client.notification({ method: "notifications/initialized" });
    await session.client.listTools();
    await session.client.callTool({ name: "connection-check" });
    expect(session.warnings).toHaveLength(1);
    expect(session.background).toHaveLength(1);
  });

  it.each(["streamable-http", "rpc"])("leaves %s clients without SSE notices or logging capability", async (type) => {
    const session = setup(type);
    await session.connect();
    await session.client.callTool({ name: "connection-check" });

    expect(session.client.getServerCapabilities()?.logging).toBeUndefined();
    expect(session.client.getInstructions()).toBeUndefined();
    expect(session.warnings).toEqual([]);
    expect(session.storage.get).not.toHaveBeenCalled();
    expect(session.background).toEqual([]);
  });

  it("does not repeat the warning when the same Durable Object session restarts", async () => {
    const storage = sessionStorage();
    const first = setup("sse", storage);
    await first.connect();
    await Promise.all(first.background);
    await first.client.close();

    const restarted = setup("sse", storage);
    await restarted.connect();
    await Promise.all(restarted.background);
    expect(first.warnings).toHaveLength(1);
    expect(restarted.warnings).toEqual([]);
    expect(restarted.client.getInstructions()).toContain("deprecated");

    const newSession = setup();
    await newSession.connect();
    await Promise.all(newSession.background);
    expect(newSession.warnings).toHaveLength(1);
  });

  it("honors the client's minimum logging level", async () => {
    const session = setup();
    let releaseRead!: () => void;
    const read = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    session.storage.get.mockImplementationOnce(async () => {
      await read;
      return undefined;
    });
    await session.connect();
    await session.client.setLoggingLevel("error");
    releaseRead();
    await Promise.all(session.background);

    expect(session.warnings).toEqual([]);
    expect(session.client.getInstructions()).toContain("deprecated");
    await session.client.callTool({ name: "connection-check" });
  });

  it("keeps tool calls working when warning delivery fails, without retrying the notice", async () => {
    const session = setup();
    const send = vi.spyOn(session.server, "sendLoggingMessage").mockRejectedValue(new Error("Disconnected"));
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    await session.connect();
    await expect(Promise.all(session.background)).resolves.toEqual([undefined]);

    const result = await session.client.callTool({ name: "connection-check" });
    expect(result.content).toEqual([{ type: "text", text: "Connected" }]);
    await session.client.notification({ method: "notifications/initialized" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("Unable to deliver legacy SSE deprecation notice");

    const restarted = setup("sse", session.storage);
    await restarted.connect();
    await Promise.all(restarted.background);
    expect(restarted.warnings).toEqual([]);
  });

  it("keeps initialization and tools working when notice storage is unavailable", async () => {
    const session = setup();
    session.storage.put.mockRejectedValue(new Error("Storage unavailable"));
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    await session.connect();
    await expect(Promise.all(session.background)).resolves.toEqual([undefined]);
    expect((await session.client.callTool({ name: "connection-check" })).isError).not.toBe(true);
    expect(session.warnings).toEqual([]);
  });
});

describe("legacy SSE OAuth resource detection", () => {
  it.each([
    ["https://mcp.vantage.sh/sse", true],
    ["https://mcp.vantage.sh/sse/message", true],
    [["https://mcp.vantage.sh/mcp", "https://mcp.vantage.sh/sse"], true],
    ["https://mcp.vantage.sh/mcp", false],
    ["https://mcp.vantage.sh/ssecret", false],
    ["https://another-server.example/sse", false],
    ["http://mcp.vantage.sh/sse", false],
    ["/sse", false],
    ["invalid URL", false],
    [undefined, false],
  ])("detects resource %j as legacy: %s", (resource, expected) => {
    expect(isLegacySseResource(resource, "https://mcp.vantage.sh/authorize")).toBe(expected);
  });
});
