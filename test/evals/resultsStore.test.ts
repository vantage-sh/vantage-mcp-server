import { join } from "node:path";
import type { EvaluateResult } from "promptfoo";
import { describe, expect, it } from "vitest";
import {
  modelIdFromResult,
  RESULTS_DIR,
  resourceFromResult,
  resultFilePath,
  summarizeResults,
  toolFromResult,
} from "../../evals/_lib/resultsStore";

function result(overrides: Partial<EvaluateResult> = {}): EvaluateResult {
  return {
    promptIdx: 0,
    testIdx: 0,
    testCase: { metadata: { tool: "get-myself", resource: "current-user" } },
    promptId: "p1",
    provider: { id: "tool-selection:gpt-5.6-sol-high:isolated", label: "gpt-5.6-sol-high · isolated" },
    prompt: { raw: "Call get-myself", label: "Call get-myself" },
    vars: { prompt: "Call get-myself", target: "get-myself" },
    failureReason: 0 as EvaluateResult["failureReason"],
    success: true,
    score: 1,
    latencyMs: 10,
    namedScores: {},
    metadata: { modelId: "gpt-5.6-sol-high" },
    ...overrides,
  };
}

describe("resultsStore helpers", () => {
  it("reads model, resource, and tool from a result", () => {
    const row = result();
    expect(modelIdFromResult(row)).toBe("gpt-5.6-sol-high");
    expect(resourceFromResult(row)).toBe("current-user");
    expect(toolFromResult(row)).toBe("get-myself");
    expect(resultFilePath("gpt-5.6-sol-high", "current-user", "get-myself")).toBe(
      join(RESULTS_DIR, "gpt-5.6-sol-high", "current-user", "get-myself.json")
    );
  });

  it("summarizes pass/fail counts", () => {
    const summary = summarizeResults([
      result({ success: true }),
      result({ success: false, error: "boom" }),
      result({ success: false, error: null }),
    ]);

    expect(summary.stats.successes).toBe(1);
    expect(summary.stats.errors).toBe(1);
    expect(summary.stats.failures).toBe(1);
    expect(summary.results).toHaveLength(3);
  });
});
