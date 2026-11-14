import { describe, expect, it } from "vitest";
import assertScenario, { type ScenarioExpectation, scoreScenario } from "../../evals/_lib/assertScenario";
import type { ToolCallRecord } from "../../evals/_lib/assertToolCalls";

function queryCostsCall(
  input: Record<string, unknown>,
  params: Record<string, string>,
  matched = true
): ToolCallRecord {
  return {
    toolName: "query-costs",
    input,
    requests: [{ endpoint: "/v2/costs", method: "GET", params, matched }],
  };
}

const categoryExpectation: ScenarioExpectation = {
  toolName: "query-costs",
  checks: [
    { arg: "filter", matches: "costs\\.category\\s*=" },
    { arg: "filter", notMatches: "cost_category" },
    { param: "groupings", includes: "cost_subcategory" },
    { param: "groupings", excludes: "subcategory" },
    { arg: "workspace_token", equals: "wrkspc_abc123" },
  ],
};

describe("scoreScenario", () => {
  it("passes when every check holds on the first target call", () => {
    const result = scoreScenario(
      [
        {
          toolName: "get-myself",
          input: {},
          requests: [{ endpoint: "/v2/me", method: "GET", params: {}, matched: true }],
        },
        queryCostsCall(
          {
            filter: "(costs.provider = 'aws' AND costs.category = 'Data Transfer')",
            groupings: ["subcategory"],
            workspace_token: "wrkspc_abc123",
          },
          { groupings: "cost_subcategory" }
        ),
      ],
      categoryExpectation
    );

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
    expect(result.reason).toContain("get-myself → query-costs");
  });

  it("scores only the first target call and lists failed checks", () => {
    const result = scoreScenario(
      [
        queryCostsCall(
          {
            filter: "(costs.provider = 'aws' AND costs.cost_category = 'Data Transfer')",
            workspace_token: "wrkspc_abc123",
          },
          { groupings: "provider,service,region" }
        ),
        queryCostsCall(
          { filter: "(costs.provider = 'aws' AND costs.category = 'Data Transfer')", workspace_token: "wrkspc_abc123" },
          { groupings: "cost_subcategory" }
        ),
      ],
      categoryExpectation
    );

    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(2 / 5);
    expect(result.reason).toContain('arg filter {"matches"');
    expect(result.reason).toContain('param groupings {"includes":"cost_subcategory"}');
    expect(result.reason).toContain("Fixed on attempt 2");
  });

  it("reports when no retry fixed the first attempt", () => {
    const wrong = queryCostsCall(
      {
        filter: "(costs.provider = 'aws' AND costs.cost_category = 'Data Transfer')",
        workspace_token: "wrkspc_abc123",
      },
      { groupings: "cost_subcategory" }
    );
    const result = scoreScenario([wrong, wrong], categoryExpectation);

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("Not fixed in 1 retry.");
  });

  it("omits the retry summary when the run stopped after the first attempt", () => {
    const wrong = queryCostsCall(
      {
        filter: "(costs.provider = 'aws' AND costs.cost_category = 'Data Transfer')",
        workspace_token: "wrkspc_abc123",
      },
      { groupings: "cost_subcategory" }
    );
    const result = scoreScenario([wrong], categoryExpectation);

    expect(result.pass).toBe(false);
    expect(result.reason).not.toMatch(/retr|Fixed on/);
  });

  it("fails when a request had no fixture, even if the checks pass", () => {
    const result = scoreScenario(
      [
        queryCostsCall(
          { filter: "(costs.provider = 'aws' AND costs.category = 'Data Transfer')", workspace_token: "wrkspc_abc123" },
          { groupings: "cost_subcategory" },
          false
        ),
      ],
      categoryExpectation
    );

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/No fixture matched: GET \/v2\/costs/);
  });

  it("fails when the target is never called", () => {
    const result = scoreScenario([{ toolName: "list-costs", input: {} }], categoryExpectation, "Which workspace?");

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/Never called query-costs\. Observed: list-costs/);
    expect(result.reason).toContain("Which workspace?");
  });
});

describe("assertScenario", () => {
  it("reads the expectation from vars", () => {
    const result = assertScenario(
      { toolCalls: [queryCostsCall({ workspace_token: "wrkspc_abc123" }, {})], text: "" },
      { vars: { expect: { toolName: "query-costs", checks: [{ arg: "workspace_token", equals: "wrkspc_abc123" }] } } }
    );
    expect(result.pass).toBe(true);
  });

  it("rejects cases without an expectation", () => {
    expect(assertScenario({ toolCalls: [], text: "" }, { vars: {} }).reason).toMatch(/vars\.expect/);
  });
});
