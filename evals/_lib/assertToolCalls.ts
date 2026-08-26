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
 * Exact single-tool match: the model must make one call with the expected
 * tool name and args. Missing and additional calls fail.
 */
export function scoreToolCalls(
  actualCalls: ToolCallRecord[],
  expectedCalls: ToolCallRecord[],
  modelText = ""
): ToolCallScore {
  if (expectedCalls.length !== 1) {
    return { pass: false, score: 0, reason: "Eval case must expect exactly one tool call." };
  }

  const expected = expectedCalls[0];

  if (actualCalls.length === 0) {
    const textSummary = modelText.length > 0 ? ` Model response: ${JSON.stringify(modelText)}.` : "";
    return {
      pass: false,
      score: 0,
      reason: `Model did not call a tool. Expected: ${expected.toolName}.${textSummary}`,
    };
  }

  const actualSummary = actualCalls
    .map((call) => `${call.toolName}(${JSON.stringify(normalize(call.input))})`)
    .join(", ");

  if (actualCalls.length !== 1) {
    return {
      pass: false,
      score: 0,
      reason: `Model called ${actualCalls.length} tools. Expected exactly one: ${expected.toolName}. Actual: ${actualSummary}.`,
    };
  }

  const actual = actualCalls[0];
  if (actual.toolName === expected.toolName && sameInput(actual.input, expected.input)) {
    return { pass: true, score: 1, reason: "Expected tool call matched." };
  }

  const expectedSummary = `${expected.toolName}(${JSON.stringify(normalize(expected.input))})`;

  return {
    pass: false,
    score: 0,
    reason: `Expected ${expectedSummary}. Actual: ${actualSummary}.`,
  };
}

export default function assertToolCalls(output: unknown, context: { vars?: Record<string, unknown> }): ToolCallScore {
  const expected = context.vars?.expected;
  if (!Array.isArray(expected)) {
    return { pass: false, score: 0, reason: "Test vars.expected must be an array of tool calls." };
  }

  const actual = parseToolSelectionOutput(output);
  return scoreToolCalls(actual.toolCalls, expected as ToolCallRecord[], actual.text);
}
