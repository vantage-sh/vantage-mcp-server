import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { GetMeResponse, GetResourceResponse } from "@vantage-sh/vantage-client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import "../../src/tools";
import {
  getRegisteredToolNames,
  setupRegisteredTools,
  type ToolCallContext,
} from "../../src/tools/structure/registerTool";

const currentUser = {
  default_workspace_token: null,
  workspaces: [],
  bearer_token: { description: "Test token", created_at: "2026-10-02T00:00:00Z", scope: ["read"] },
  is_account_owner: false,
} satisfies GetMeResponse;

const resource = {
  token: "prvdr_rsrc_123",
  uuid: "i-123",
  type: "aws_instance",
  label: null,
  metadata: { instance_type: "t3.small", cpu: { average: 0.2 }, metrics: [null, 1, "2"] },
  account_id: null,
  billing_account_id: null,
  provider: "aws",
  region: null,
  created_at: "2026-10-02T00:00:00Z",
  tags: { team: "Engineering", custom: { values: ["one", "two"] } },
  costs: [{ category: "compute", amount: 12.34 }],
} satisfies GetResourceResponse;

const api = vi.fn<ToolCallContext["callVantageApi"]>();
let server: McpServer;
let client: Client;

beforeEach(async () => {
  api.mockReset();
  server = new McpServer({ name: "output-schema-test", version: "1.0.0" });
  setupRegisteredTools(server, () => ({ callVantageApi: api }));
  client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await server.close();
});

test("every registered tool publishes a usable object output schema", async () => {
  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name).sort()).toEqual(getRegisteredToolNames().sort());
  const validator = new AjvJsonSchemaValidator();
  for (const tool of tools) {
    expect(tool.outputSchema, tool.name).toBeDefined();
    expect(tool.outputSchema?.type, tool.name).toBe("object");
    expect(Object.keys(tool.outputSchema?.properties ?? {}), tool.name).not.toHaveLength(0);
    expect(() => validator.getValidator(tool.outputSchema!), tool.name).not.toThrow();
  }
});

test("successful calls return structured output and matching text content", async () => {
  api.mockResolvedValue({ ok: true, data: currentUser });
  await client.listTools();
  const result = await client.callTool({ name: "get-myself", arguments: {} });
  expect(result).toEqual({
    structuredContent: currentUser,
    content: [{ type: "text", text: JSON.stringify(currentUser, null, 2) }],
    isError: false,
  });
});

test("provider-specific metadata, nullable fields, and numeric resource costs survive validation", async () => {
  api.mockResolvedValue({ ok: true, data: resource });
  await client.listTools();
  const result = await client.callTool({
    name: "get-provider-resource",
    arguments: { resource_token: resource.token },
  });
  expect(result.structuredContent).toEqual(resource);
  expect(result.isError).toBe(false);
});

test("the MCP server rejects responses missing required output fields", async () => {
  const { is_account_owner: _, ...invalidResponse } = currentUser;
  api.mockResolvedValue({ ok: true, data: invalidResponse });
  const result = await client.callTool({ name: "get-myself", arguments: {} });
  expect(result.isError).toBe(true);
  expect(result.content).toEqual([{ type: "text", text: expect.stringContaining("Output validation error") }]);
});

test("upstream errors remain MCP errors without structured output", async () => {
  api.mockResolvedValue({ ok: false, errors: [{ message: "Invalid token" }] });
  const result = await client.callTool({ name: "get-myself", arguments: {} });
  expect(result).toEqual({
    content: [{ type: "text", text: JSON.stringify({ errors: [{ message: "Invalid token" }] }, null, 2) }],
    isError: true,
  });
});

test("Virtual Tag Config job alternatives are enforced in the published JSON schema", async () => {
  const { tools } = await client.listTools();
  const outputSchema = tools.find((tool) => tool.name === "update-virtual-tag-config")!.outputSchema!;
  const validator = new AjvJsonSchemaValidator().getValidator(outputSchema);
  const job = { request_id: "request_123", status_url: "/v2/virtual_tag_configs/vtag_123/status/request_123" };
  expect(validator(job).valid).toBe(true);
  expect(validator({ request_id: job.request_id }).valid).toBe(false);
  expect(validator({}).valid).toBe(false);
  api.mockResolvedValue({ ok: true, data: job });
  const result = await client.callTool({
    name: "update-virtual-tag-config",
    arguments: { virtual_tag_config_token: "vtag_123", key: "team" },
  });
  expect(result.structuredContent).toEqual(job);
  expect(result.isError).toBe(false);
});
