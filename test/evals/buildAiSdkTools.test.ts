import { describe, expect, it } from "vitest";
import type { ApiFixture } from "../../evals/_lib/apiFixtures";
import { buildAiSdkTools, type FixtureExecution } from "../../evals/_lib/buildAiSdkTools";

const costsFixture: ApiFixture = {
  endpoint: "/v2/costs",
  method: "GET",
  result: { ok: true, data: { costs: [], total_cost: { amount: "0.00", currency: "USD" } } },
};

const queryCostsInput = {
  filter: "(costs.provider = 'aws')",
  workspace_token: "wrkspc_abc123",
  groupings: ["service", "region"],
  page: 1,
};

function executeTool(fixtureExecution: FixtureExecution, name: string, input: Record<string, unknown>) {
  const execute = buildAiSdkTools([name], fixtureExecution)[name]?.execute;
  if (!execute) {
    throw new Error(`${name} has no execute`);
  }
  return execute(input, { toolCallId: "call-1", messages: [] });
}

describe("buildAiSdkTools", () => {
  it("sets strict: false so OpenAI omits unused optional tool args", () => {
    const tools = buildAiSdkTools(["get-myself"]);
    expect(tools["get-myself"]?.strict).toBe(false);
  });

  it("runs the real handler against fixtures and records the request it sends", async () => {
    const fixtureExecution: FixtureExecution = { fixtures: [costsFixture], executions: new Map() };

    const output = await executeTool(fixtureExecution, "query-costs", queryCostsInput);

    expect(output).toMatchObject({ costs: [], total_cost: { amount: "0.00" } });
    const log = fixtureExecution.executions.get("call-1");
    expect(log?.error).toBeUndefined();
    expect(log?.requests).toHaveLength(1);
    expect(log?.requests[0]).toMatchObject({
      endpoint: "/v2/costs",
      method: "GET",
      matched: true,
      params: { groupings: "service,region", limit: 1000 },
    });
  });

  it("returns API errors to the model the way the MCP server does", async () => {
    const fixtureExecution: FixtureExecution = { fixtures: [], executions: new Map() };

    const output = await executeTool(fixtureExecution, "query-costs", queryCostsInput);

    expect(output).toMatchObject({ isError: true, errors: [{ message: expect.stringMatching(/No eval fixture/) }] });
    const log = fixtureExecution.executions.get("call-1");
    expect(log?.error).toMatch(/No eval fixture/);
    expect(log?.requests[0]?.matched).toBe(false);
  });
});
