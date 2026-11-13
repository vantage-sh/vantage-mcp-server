import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { ApiFixture } from "../../evals/_lib/apiFixtures";
import { runToolSelection } from "../../evals/_lib/runToolSelection";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

type Step = ReturnType<typeof toolCallStep>;

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

const costsFixture: ApiFixture = {
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

  it("with fixtures, records each call's requests and stops once the target is called", async () => {
    const model = mockModel([
      toolCallStep("call-1", "get-myself", {}),
      toolCallStep("call-2", "query-costs", { ...queryCostsInput, groupings: ["cost_category"] }),
      toolCallStep("call-3", "query-costs", queryCostsInput),
    ]);

    const result = await runToolSelection({
      prompt: "AWS costs by category",
      model,
      toolNames: ["query-costs", "get-myself"],
      fixtures: [costsFixture],
      target: "query-costs",
    });

    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.toolCalls.map((call) => call.toolName)).toEqual(["get-myself", "query-costs"]);
    expect(result.toolCalls[0]).toMatchObject({
      error: expect.stringMatching(/No eval fixture/),
      requests: [{ endpoint: "/v2/me", matched: false }],
    });
    expect(result.toolCalls[1].error).toBeUndefined();
    expect(result.toolCalls[1].requests?.[0]).toMatchObject({
      matched: true,
      params: { groupings: "cost_category" },
    });
  });
});
