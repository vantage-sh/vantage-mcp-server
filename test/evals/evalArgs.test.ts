import { describe, expect, it } from "vitest";
import { hasPartialResultFilter, parseEvalArgs, validateEvalScope } from "../../evals/_lib/evalArgs";

describe("eval command arguments", () => {
  it("parses a targeted eval and preserves promptfoo flags", () => {
    expect(
      parseEvalArgs(["--tool", "get-myself", "--model", "gpt-5.6-sol-high", "--filter-metadata", "phrasing=direct"])
    ).toEqual({
      all: false,
      help: false,
      listModels: false,
      tool: "get-myself",
      model: "gpt-5.6-sol-high",
      passthrough: ["--filter-metadata", "phrasing=direct"],
    });
  });

  it("allows an explicit full eval", () => {
    const parsed = parseEvalArgs(["--all", "--model", "gpt-5.6-sol-high"]);
    expect(validateEvalScope(parsed)).toBeUndefined();
  });

  it("rejects an implicit full eval", () => {
    const parsed = parseEvalArgs(["--model", "gpt-5.6-sol-high"]);
    const error = validateEvalScope(parsed);
    expect(error).toMatch(/--tool <name> is required/);
    expect(error).toMatch(/npm run eval -- --tool/);
  });

  it("rejects combining a targeted and full eval", () => {
    const parsed = parseEvalArgs(["--all", "--tool", "get-myself", "--model", "gpt-5.6-sol-high"]);
    expect(validateEvalScope(parsed)).toMatch(/either --tool <name> or the eval:all command/);
  });

  it("recognizes promptfoo filters that produce partial result sets", () => {
    expect(hasPartialResultFilter(["--filter-failing", "previous.json"])).toBe(true);
    expect(hasPartialResultFilter(["--filter-metadata=phrasing=direct"])).toBe(true);
    expect(hasPartialResultFilter(["--no-cache"])).toBe(false);
  });
});
