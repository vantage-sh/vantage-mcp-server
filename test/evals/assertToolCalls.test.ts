import { describe, expect, it } from "vitest";
import assertToolCalls, { scoreToolCalls } from "../../evals/_lib/assertToolCalls";

describe("scoreToolCalls", () => {
  it("passes when the expected tool and args are present", () => {
    const result = scoreToolCalls(
      [
        { toolName: "get-myself", input: {} },
        { toolName: "list-cost-providers", input: { limit: 10 } },
      ],
      [{ toolName: "get-myself", input: {} }]
    );

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it("fails when no tool is called", () => {
    const result = scoreToolCalls([], [{ toolName: "get-myself", input: {} }]);
    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/did not call a tool/i);
  });

  it("fails when args do not match", () => {
    const result = scoreToolCalls(
      [{ toolName: "get-myself", input: { extra: true } }],
      [{ toolName: "get-myself", input: {} }]
    );
    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/Missing/);
  });
});

describe("assertToolCalls", () => {
  it("reads expected calls from vars", () => {
    const result = assertToolCalls(
      { toolCalls: [{ toolName: "get-myself", input: {} }], text: "" },
      { vars: { expected: [{ toolName: "get-myself", input: {} }] } }
    );
    expect(result.pass).toBe(true);
  });
});
