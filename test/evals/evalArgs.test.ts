import { describe, expect, it } from "vitest";
import { parseEvalArgs, validateEvalScope } from "../../evals/_lib/evalArgs";

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
    expect(validateEvalScope(parsed)).toMatch(/--tool <name> is required/);
  });

  it("rejects combining a targeted and full eval", () => {
    const parsed = parseEvalArgs(["--all", "--tool", "get-myself", "--model", "gpt-5.6-sol-high"]);
    expect(validateEvalScope(parsed)).toMatch(/either --tool <name> or the eval:all command/);
  });
});
