import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { expect, it, vi } from "vitest";
import z from "zod";
import { createMutationConfirmation } from "../../src/mcp/confirm-mutation";
import { parseConfirmationPolicy } from "../../src/mcp/confirmation-policy";
import registerTool, {
  clearRegisteredToolsForTesting,
  setupRegisteredTools,
} from "../../src/tools/structure/registerTool";

it("preserves structured output validation after a live-session confirmation round", async () => {
  clearRegisteredToolsForTesting();
  const execute = vi.fn(async (args: { value: string }) => ({ value: args.value }));
  registerTool({
    name: "create-structured-fixture",
    title: "Create Structured Fixture",
    description: "Test structured output after confirmation",
    args: { value: z.string() },
    outputSchema: { value: z.string() },
    annotations: { readOnly: false, destructive: false, openWorld: false },
    execute,
  });
  const confirmation = createMutationConfirmation({
    policy: parseConfirmationPolicy("all", []),
    key: "test-only-signing-key-with-32-bytes",
    principal: "test",
    clientCapabilities: () => server.server.getClientCapabilities(),
  });
  const server: McpServer = new McpServer({ name: "test", version: "1" }, confirmation.serverOptions);
  setupRegisteredTools(server, () => ({
    confirmMutation: confirmation.confirm,
    callVantageApi: async () => {
      throw new Error("Not used");
    },
  }));
  const client = new Client({ name: "test", version: "1" }, { capabilities: { elicitation: { form: {} } } });
  client.setRequestHandler("elicitation/create", async () => {
    expect(execute).not.toHaveBeenCalled();
    return { action: "accept", content: { confirm: true } };
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: "create-structured-fixture", arguments: { value: "confirmed" } });
    expect(result).toMatchObject({
      isError: false,
      structuredContent: { value: "confirmed" },
      content: [{ type: "text", text: JSON.stringify({ value: "confirmed" }, null, 2) }],
    });
    expect(execute).toHaveBeenCalledOnce();
  } finally {
    await client.close();
    await server.close();
    clearRegisteredToolsForTesting();
  }
});
