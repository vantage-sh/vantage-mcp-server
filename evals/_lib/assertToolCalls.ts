export type ToolCallRecord = {
  toolName: string;
  input?: unknown;
};

export type ToolSelectionOutput = {
  toolCalls: ToolCallRecord[];
  text: string;
};

export type ToolCallScore = {
  pass: boolean;
  score: number;
  reason: string;
};

export function parseToolSelectionOutput(output: unknown): ToolSelectionOutput {
  const parsed = typeof output === "string" ? (JSON.parse(output) as unknown) : output;
  if (!parsed || typeof parsed !== "object") {
    return { toolCalls: [], text: typeof output === "string" ? output : "" };
  }

  const record = parsed as Partial<ToolSelectionOutput>;
  return {
    toolCalls: Array.isArray(record.toolCalls) ? record.toolCalls : [],
    text: typeof record.text === "string" ? record.text : "",
  };
}

function normalize(value: unknown): unknown {
  if (value === undefined || value === null) {
    return {};
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((key) => [key, normalize(obj[key])])
    );
  }
  return value;
}

function sameInput(actual: unknown, expected: unknown): boolean {
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}

/**
 * Flexible tool-call match: every expected call must appear in actual
 * (name + args). Order and extra actual calls do not matter.
 */
export function scoreToolCalls(actualCalls: ToolCallRecord[], expectedCalls: ToolCallRecord[]): ToolCallScore {
  if (expectedCalls.length === 0) {
    return { pass: false, score: 0, reason: "Eval case is missing expected tool calls." };
  }

  if (actualCalls.length === 0) {
    const expected = expectedCalls.map((call) => call.toolName).join(", ");
    return { pass: false, score: 0, reason: `Model did not call a tool. Expected: ${expected}.` };
  }

  const missing = expectedCalls.filter(
    (expected) =>
      !actualCalls.some((actual) => actual.toolName === expected.toolName && sameInput(actual.input, expected.input))
  );

  if (missing.length === 0) {
    return { pass: true, score: 1, reason: "Expected tool call(s) matched." };
  }

  const actualSummary = actualCalls
    .map((call) => `${call.toolName}(${JSON.stringify(normalize(call.input))})`)
    .join(", ");
  const missingSummary = missing.map((call) => `${call.toolName}(${JSON.stringify(normalize(call.input))})`).join(", ");

  return {
    pass: false,
    score: 0,
    reason: `Missing ${missingSummary}. Actual: ${actualSummary}.`,
  };
}

export default function assertToolCalls(output: unknown, context: { vars?: Record<string, unknown> }): ToolCallScore {
  const expected = context.vars?.expected;
  if (!Array.isArray(expected)) {
    return { pass: false, score: 0, reason: "Test vars.expected must be an array of tool calls." };
  }

  return scoreToolCalls(parseToolSelectionOutput(output).toolCalls, expected as ToolCallRecord[]);
}
