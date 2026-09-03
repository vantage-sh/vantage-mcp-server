import { afterEach, describe, expect, it } from "vitest";

const originalEvalModel = process.env.EVAL_MODEL;

afterEach(() => {
  if (originalEvalModel === undefined) {
    delete process.env.EVAL_MODEL;
  } else {
    process.env.EVAL_MODEL = originalEvalModel;
  }
});

describe("promptfoo config", () => {
  it("loads one distractor-backed provider for the selected model", async () => {
    process.env.EVAL_MODEL = "gpt-5.6-sol-high";

    const { default: config } = await import("../../evals/promptfooconfig");

    expect(config.providers).toEqual([
      {
        id: "file://_lib/provider.ts",
        label: "gpt-5.6-sol-high · mixed",
        config: { modelId: "gpt-5.6-sol-high" },
      },
    ]);
  });
});
