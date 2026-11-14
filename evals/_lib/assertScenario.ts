import { parseToolSelectionOutput, type ToolCallRecord, type ToolCallScore } from "./assertToolCalls";
import { type CallCheck, describeCheck, failedChecks } from "./checks";

export type ScenarioExpectation = {
  toolName: string;
  checks: CallCheck[];
};

function summarize(call: ToolCallRecord): string {
  return `${call.toolName}(${JSON.stringify(call.input ?? {})})`;
}

function failuresFor(call: ToolCallRecord, checks: readonly CallCheck[]): CallCheck[] {
  return failedChecks(checks, { input: call.input, params: call.requests?.[0]?.params });
}

/**
 * Passes only when the model's first call to the expected tool passes every check, and every
 * API request in the run matched a fixture. Later attempts are reported but never pass the cell.
 */
export function scoreScenario(
  calls: ToolCallRecord[],
  expectation: ScenarioExpectation,
  modelText = ""
): ToolCallScore {
  const path = calls.map((call) => call.toolName).join(" → ") || "(no tools)";
  const unmatched = calls.flatMap((call) => (call.requests ?? []).filter((request) => !request.matched));
  const fixtureGap =
    unmatched.length > 0
      ? ` No fixture matched: ${unmatched.map((request) => `${request.method} ${request.endpoint} ${JSON.stringify(request.params)}`).join("; ")}.`
      : "";

  const attempts = calls.filter((call) => call.toolName === expectation.toolName);
  const [first, ...retries] = attempts;
  if (!first) {
    const textSummary = modelText.length > 0 ? ` Model response: ${JSON.stringify(modelText)}.` : "";
    return {
      pass: false,
      score: 0,
      reason: `Never called ${expectation.toolName}. Observed: ${path}.${fixtureGap}${textSummary}`,
    };
  }

  const failed = failuresFor(first, expectation.checks);
  const pass = failed.length === 0 && unmatched.length === 0;
  const request = first.requests?.[0]?.params;
  const requestSummary = request === undefined ? "" : ` Request: ${JSON.stringify(request)}.`;
  const errorSummary = first.error ? ` Error: ${first.error}.` : "";
  const failedSummary = failed.length > 0 ? ` Failed: ${failed.map(describeCheck).join("; ")}.` : "";
  let retrySummary = "";
  if (failed.length > 0) {
    const fixedAt = retries.findIndex((call) => failuresFor(call, expectation.checks).length === 0);
    retrySummary =
      fixedAt === -1
        ? ` Not fixed in ${retries.length} retr${retries.length === 1 ? "y" : "ies"}.`
        : ` Fixed on attempt ${fixedAt + 2}: ${summarize(retries[fixedAt])}.`;
  }

  return {
    pass,
    score:
      expectation.checks.length === 0
        ? pass
          ? 1
          : 0
        : (expectation.checks.length - failed.length) / expectation.checks.length,
    reason: `${pass ? "First attempt passed" : "First attempt failed"}: ${summarize(first)}. Observed: ${path}.${requestSummary}${errorSummary}${failedSummary}${retrySummary}${fixtureGap}`,
  };
}

export default function assertScenario(output: unknown, context: { vars?: Record<string, unknown> }): ToolCallScore {
  const expectation = context.vars?.expect as ScenarioExpectation | undefined;
  if (!expectation || typeof expectation.toolName !== "string" || !Array.isArray(expectation.checks)) {
    return { pass: false, score: 0, reason: "Test vars.expect must name a tool and list its checks." };
  }

  const actual = parseToolSelectionOutput(output);
  return scoreScenario(actual.toolCalls, expectation, actual.text);
}
