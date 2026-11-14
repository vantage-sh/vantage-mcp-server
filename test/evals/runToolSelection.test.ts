import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { ApiFixture } from "../../evals/_lib/apiFixtures";
import { runToolSelection } from "../../evals/_lib/runToolSelection";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

type Step = ReturnType<typeof toolCallStep> | ReturnType<typeof textStep>;

function mockModel(steps: Step[]): MockLanguageModelV3 {
  let next = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => {
      const step = steps[next];
      next += 1;
      if (!step) {
        throw new Error("Mock model ran out of steps");
      }
      return step;
    },
  });
}

function toolCallStep(toolCallId: string, toolName: string, input: Record<string, unknown>) {
  return {
    content: [{ type: "tool-call" as const, toolCallId, toolName, input: JSON.stringify(input) }],
    finishReason: { unified: "tool-calls" as const, raw: undefined },
    usage,
    warnings: [],
  };
}

function textStep(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: undefined },
    usage,
    warnings: [],
  };
}

const correctCosts: ApiFixture = {
  endpoint: "/v2/costs",
  method: "GET",
  when: [{ param: "groupings", includes: "cost_category" }],
  result: { ok: true, data: { costs: [], total_cost: { amount: "42.00", currency: "USD" } } },
};

const emptyCosts: ApiFixture = {
  endpoint: "/v2/costs",
  method: "GET",
  result: { ok: true, data: { costs: [], total_cost: { amount: "0.00", currency: "USD" } } },
};

const queryCostsInput = { filter: "(costs.provider = 'aws')", workspace_token: "wrkspc_abc123" };

describe("runToolSelection", () => {
  it("makes one no-op step without fixtures", async () => {
    const model = mockModel([toolCallStep("call-1", "query-costs", queryCostsInput)]);

    const result = await runToolSelection({ prompt: "AWS costs", model, toolNames: ["query-costs"] });

    expect(model.doGenerateCalls).toHaveLength(1);
    expect(result.toolCalls).toEqual([{ toolName: "query-costs", input: expect.objectContaining(queryCostsInput) }]);
  });

  it("with fixtures, answers a wrong call with the incorrect response and lets the model retry", async () => {
    const model = mockModel([
      toolCallStep("call-1", "get-myself", {}),
      toolCallStep("call-2", "query-costs", { ...queryCostsInput, groupings: ["category"] }),
      toolCallStep("call-3", "query-costs", { ...queryCostsInput, groupings: ["cost_category"] }),
      textStep("AWS costs by category total $42.00."),
    ]);

    const result = await runToolSelection({
      prompt: "AWS costs by category",
      model,
      toolNames: ["query-costs", "get-myself"],
      fixtures: [correctCosts, emptyCosts],
    });

    expect(model.doGenerateCalls).toHaveLength(4);
    expect(result.text).toBe("AWS costs by category total $42.00.");
    expect(result.toolCalls.map((call) => call.toolName)).toEqual(["get-myself", "query-costs", "query-costs"]);
    expect(result.toolCalls[0]).toMatchObject({
      error: expect.stringMatching(/No eval fixture/),
      requests: [{ endpoint: "/v2/me", matched: false }],
    });
    expect(result.toolCalls[1].requests?.[0]).toMatchObject({ matched: true, params: { groupings: "category" } });
    expect(result.toolCalls[2].requests?.[0]).toMatchObject({ matched: true, params: { groupings: "cost_category" } });
    expect(JSON.stringify(model.doGenerateCalls[2].prompt)).toContain("0.00");
    expect(JSON.stringify(model.doGenerateCalls[3].prompt)).toContain("42.00");
  });

  it("stops after maxTargetCalls calls to the target, not counting lookups", async () => {
    const model = mockModel([
      toolCallStep("call-1", "get-myself", {}),
      toolCallStep("call-2", "query-costs", { ...queryCostsInput, groupings: ["category"] }),
      toolCallStep("call-3", "query-costs", { ...queryCostsInput, groupings: ["cost_category"] }),
      toolCallStep("call-4", "query-costs", { ...queryCostsInput, page: 2 }),
    ]);

    const result = await runToolSelection({
      prompt: "AWS costs by category",
      model,
      toolNames: ["query-costs", "get-myself"],
      fixtures: [correctCosts, emptyCosts],
      target: "query-costs",
      maxTargetCalls: 2,
    });

    expect(model.doGenerateCalls).toHaveLength(3);
    expect(result.toolCalls.map((call) => call.toolName)).toEqual(["get-myself", "query-costs", "query-costs"]);
  });

  it("stops at maxSteps", async () => {
    const model = mockModel([
      toolCallStep("call-1", "query-costs", queryCostsInput),
      toolCallStep("call-2", "query-costs", queryCostsInput),
      toolCallStep("call-3", "query-costs", queryCostsInput),
    ]);

    const result = await runToolSelection({
      prompt: "AWS costs",
      model,
      toolNames: ["query-costs"],
      fixtures: [emptyCosts],
      maxSteps: 2,
    });

    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.toolCalls).toHaveLength(2);
  });
});
