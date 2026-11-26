import { describe, expect, it } from "vitest";
import type { ApiFixture } from "../../evals/_lib/apiFixtures";
import { buildScenarioCases, buildToolCases } from "../../evals/_lib/buildCases";

describe("buildToolCases", () => {
  it("passes named distractors through to the provider vars", () => {
    const cases = buildToolCases({
      target: "get-myself",
      resource: "current-user",
      distractors: ["list-workspaces"],
      directPrompts: [{ input: "Get my user", expected: [{ toolName: "get-myself", input: {} }] }],
      inferredPrompts: [],
    });

    expect(cases).toHaveLength(1);
    expect(cases[0].vars).toMatchObject({
      target: "get-myself",
      distractors: ["list-workspaces"],
    });
    expect(cases[0].options).toEqual({ disableVarExpansion: true });
  });
});

describe("buildScenarioCases", () => {
  it("orders correct, scenario, incorrect, then shared fixtures and asserts with the scenario scorer", () => {
    const checks = [{ param: "groupings", includes: "cost_category" }];
    const answer: ApiFixture = {
      endpoint: "/v2/costs",
      method: "GET",
      result: { ok: true, data: { costs: [], total_cost: { amount: "42.00", currency: "USD" } } },
    };
    const empty: ApiFixture = {
      endpoint: "/v2/costs",
      method: "GET",
      result: { ok: true, data: { costs: [], total_cost: { amount: "0.00", currency: "USD" } } },
    };
    const rejection: ApiFixture = {
      endpoint: "/v2/costs",
      method: "GET",
      params: { groupings: "category" },
      result: { ok: false, errors: ["Invalid grouping"] },
    };
    const lookup: ApiFixture = {
      endpoint: "/v2/cost_providers",
      method: "GET",
      result: { ok: true, data: { cost_providers: [] } },
    };

    const cases = buildScenarioCases({
      target: "query-costs",
      resource: "costs",
      distractors: ["list-costs"],
      incorrect: empty,
      fixtures: [lookup],
      maxSteps: 3,
      scenarios: [
        {
          scenario: "category-grouping",
          input: "Break down AWS costs by cost category.",
          checks: [{ param: "groupings", includes: "cost_category" }],
          correct: answer,
          fixtures: [rejection],
        },
      ],
    });

    expect(cases).toHaveLength(1);
    expect(cases[0].vars).toMatchObject({
      target: "query-costs",
      distractors: ["list-costs"],
      fixtures: [{ ...answer, when: checks }, rejection, empty, lookup],
      maxSteps: 3,
      expect: { toolName: "query-costs", checks: [{ param: "groupings", includes: "cost_category" }] },
    });
    expect(cases[0].vars).toHaveProperty("maxTargetCalls", 1);
    expect(cases[0].metadata).toMatchObject({ resource: "costs", phrasing: "scenario", scenario: "category-grouping" });
    expect(cases[0].assert).toEqual([{ type: "javascript", value: "file://_lib/assertScenario.ts" }]);
    expect(cases[0].options).toEqual({ disableVarExpansion: true });
  });

  it("passes maxTargetCalls through, with a scenario override taking precedence", () => {
    const empty: ApiFixture = {
      endpoint: "/v2/costs",
      method: "GET",
      result: { ok: true, data: { costs: [], total_cost: { amount: "0.00", currency: "USD" } } },
    };
    const scenario = {
      input: "AWS costs by service.",
      checks: [{ param: "groupings", includes: "service" }],
      correct: empty,
    };

    const cases = buildScenarioCases({
      target: "query-costs",
      resource: "costs",
      incorrect: empty,
      fixtures: [],
      maxTargetCalls: 2,
      scenarios: [
        { ...scenario, scenario: "retry" },
        { ...scenario, scenario: "pagination", maxTargetCalls: 3 },
      ],
    });

    expect(cases.map((testCase) => testCase.vars?.maxTargetCalls)).toEqual([2, 3]);
  });
});
