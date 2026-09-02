import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EvaluateResult, OutputFile } from "promptfoo";
import { afterEach, describe, expect, it } from "vitest";
import {
  asOutputFile,
  extractResults,
  mergeResultCells,
  modelIdFromResult,
  RESULTS_DIR,
  readOutputFile,
  resourceFromResult,
  resultFilePath,
  splitOutputIntoToolFiles,
  summarizeResults,
  toolFromResult,
  writeOutputFile,
} from "../../evals/_lib/resultsStore";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function result(overrides: Partial<EvaluateResult> = {}): EvaluateResult {
  return {
    promptIdx: 0,
    testIdx: 0,
    testCase: { metadata: { tool: "get-myself", resource: "current-user" } },
    promptId: "p1",
    provider: { id: "tool-selection:gpt-5.6-sol-high:mixed", label: "gpt-5.6-sol-high · mixed" },
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

  it("merges rerun cells without dropping cells that were filtered out", () => {
    const storedFailure = result({ success: false, score: 0 });
    const storedOtherCell = result({
      testCase: { metadata: { tool: "get-myself", resource: "current-user", phrasing: "inferred" } },
      vars: { prompt: "Inspect my Vantage identity", target: "get-myself" },
    });
    const rerunPass = result({
      id: "new-run-id",
      promptIdx: 12,
      testIdx: 34,
      success: true,
      score: 1,
      latencyMs: 20,
    });

    const merged = mergeResultCells([storedFailure, storedOtherCell], [rerunPass]);

    expect(merged).toEqual([rerunPass, storedOtherCell]);
  });

  it("preserves stored cells when splitting partial promptfoo output", async () => {
    const resultsDir = await mkdtemp(join(tmpdir(), "vantage-eval-results-"));
    tempDirs.push(resultsDir);
    const path = resultFilePath("gpt-5.6-sol-high", "current-user", "get-myself", resultsDir);
    const storedOtherCell = result({
      testCase: { metadata: { tool: "get-myself", resource: "current-user", phrasing: "inferred" } },
      vars: { prompt: "Inspect my Vantage identity", target: "get-myself" },
    });
    await writeOutputFile(path, asOutputFile([result({ success: false, score: 0 }), storedOtherCell]));

    const partialOutput: OutputFile = asOutputFile([result({ success: true, score: 1, latencyMs: 20 })]);
    await splitOutputIntoToolFiles(partialOutput, { mergeExisting: true, resultsDir });

    expect(extractResults(await readOutputFile(path))).toEqual([
      expect.objectContaining({ success: true, latencyMs: 20 }),
      storedOtherCell,
    ]);
  });
});
