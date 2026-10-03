import { Client } from "@modelcontextprotocol/client";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport as LegacyTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer as LegacyServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { afterEach, expect, it } from "vitest";
import z from "zod";
import wrapMap from "../../src/resources/bootstrapping/utils/wrapMap";
import { hideAccessPolicyToolsFromNonOwners } from "../../src/tools/access-policies/gating";
import MCPUserError from "../../src/tools/structure/MCPUserError";
import registerTool, {
  clearRegisteredToolsForTesting,
  setupRegisteredTools,
} from "../../src/tools/structure/registerTool";

afterEach(clearRegisteredToolsForTesting);

it.each(["v1", "v2"])("registers tools and resources with %s without sharing SDK objects", async (version) => {
  registerTool({
    name: "structured-test",
    title: "Structured Test",
    description: "Return structured data or a user error",
    args: { fail: z.boolean().optional() },
    outputSchema: { message: z.string() },
    annotations: { readOnly: true, destructive: false, openWorld: false },
    async execute(args) {
      if (args.fail) throw new MCPUserError({ errors: [{ message: "Expected failure" }] });
      return { message: "ok" };
    },
  });
  registerTool({
    name: "list-access-policies",
    title: "Owner Only",
    description: "Owner only test tool",
    args: {},
    annotations: { readOnly: true, destructive: false, openWorld: false },
    async execute() {
      return {};
    },
  });
  const server =
    version === "v1" ? new LegacyServer({ name: "test", version: "1" }) : new McpServer({ name: "test", version: "1" });
  const ctx = { callVantageApi: async () => ({ ok: false as const, errors: [] }) };
  const handles = setupRegisteredTools(server, () => ctx);
  await hideAccessPolicyToolsFromNonOwners(handles, ctx);
  wrapMap(new Map([["test.md", { content: "# VQL", title: "VQL", description: "Test resource" }]]))(server);
  const client =
    version === "v1" ? new LegacyClient({ name: "test", version: "1" }) : new Client({ name: "test", version: "1" });
  const [clientTransport, serverTransport] =
    version === "v1" ? LegacyTransport.createLinkedPair() : InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const catalog = await client.listTools();
    expect(catalog.tools.map((tool) => tool.name)).toEqual(["structured-test"]);
    expect(catalog.tools[0]).toMatchObject({
      inputSchema: { type: "object", properties: { fail: { type: "boolean" } } },
      outputSchema: { type: "object", required: ["message"] },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    });
    expect(await client.callTool({ name: "structured-test", arguments: {} })).toMatchObject({
      content: [{ type: "text", text: JSON.stringify({ message: "ok" }, null, 2) }],
      structuredContent: { message: "ok" },
      isError: false,
    });
    expect(await client.callTool({ name: "structured-test", arguments: { fail: true } })).toMatchObject({
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ errors: [{ message: "Expected failure" }] }, null, 2) }],
    });
    expect(await client.callTool({ name: "structured-test", arguments: { fail: "invalid" } })).toMatchObject({
      isError: true,
    });
    expect((await client.listResources()).resources).toMatchObject([
      { uri: "file://vantage/test.md", mimeType: "text/markdown" },
    ]);
    expect(await client.readResource({ uri: "file://vantage/test.md" })).toMatchObject({
      contents: [{ text: "# VQL" }],
    });
  } finally {
    await client.close();
    await server.close();
  }
});
