import { describe, expect, it } from "vitest";
import { buildToolCases } from "../../evals/_lib/buildCases";

describe("buildToolCases", () => {
  it("passes named distractors through to the provider vars", () => {
    const cases = buildToolCases({
      target: "get-myself",
      resource: "current-user",
      distractors: ["list-workspaces"],
      directPrompts: [{ input: "Get my user", expected: [{ toolName: "get-myself", input: {} }] }],
      inferredPrompts: [],
    });

    expect(cases[0].vars).toMatchObject({
      target: "get-myself",
      distractors: ["list-workspaces"],
    });
  });
});
