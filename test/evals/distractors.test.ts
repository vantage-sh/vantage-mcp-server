import { describe, expect, it } from "vitest";
import { MIXED_DISTRACTOR_COUNT, pickTools } from "../../evals/_lib/distractors";
import { getRegisteredToolNames } from "../../src/tools/structure/registerTool";

const TARGET = "get-myself";

describe("pickTools", () => {
  it("loads only the target in isolated mode", () => {
    expect(pickTools(TARGET, "isolated")).toEqual([TARGET]);
  });

  it("samples four unique distractors from all registered tools reproducibly", () => {
    const first = pickTools(TARGET, "mixed");
    const second = pickTools(TARGET, "mixed");
    const registered = new Set(getRegisteredToolNames());

    expect(first).toEqual(second);
    expect(first).toHaveLength(MIXED_DISTRACTOR_COUNT + 1);
    expect(first[0]).toBe(TARGET);
    expect(new Set(first)).toHaveLength(first.length);
    expect(first.every((name) => registered.has(name))).toBe(true);
  });

  it("keeps named distractors and fills the remaining slots", () => {
    const named = ["list-workspaces", "get-user"];
    const tools = pickTools(TARGET, "mixed", named);

    expect(tools.slice(0, named.length + 1)).toEqual([TARGET, ...named]);
    expect(tools).toHaveLength(MIXED_DISTRACTOR_COUNT + 1);
    expect(new Set(tools)).toHaveLength(tools.length);
  });

  it("rejects invalid named distractors", () => {
    expect(() => pickTools(TARGET, "mixed", [TARGET])).toThrow(/cannot also be a distractor/);
    expect(() => pickTools(TARGET, "mixed", ["not-a-tool"])).toThrow(/not registered/);
    expect(() => pickTools(TARGET, "mixed", ["get-user", "get-user"])).toThrow(/Duplicate distractor/);
  });
});
