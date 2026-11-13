import type { JsonValue } from "./apiFixtures";
import { parseToolSelectionOutput, type ToolCallRecord, type ToolCallScore } from "./assertToolCalls";

type ValueCheck =
  | { equals: JsonValue }
  | { matches: string; flags?: string }
  | { notMatches: string; flags?: string }
  /** Arrays contain the value; strings are treated as comma-separated lists. */
  | { includes: string }
  | { excludes: string };

/**
 * `arg` reads the model's tool input. `param` reads the first API request the handler sent,
 * so it sees the handler's transforms (for example, groupings joined into one string).
 */
export type CallCheck = ({ arg: string } | { param: string }) & ValueCheck;

export type ScenarioExpectation = {
  toolName: string;
  checks: CallCheck[];
};

function field(record: unknown, key: string): unknown {
  return typeof record === "object" && record !== null && !Array.isArray(record)
    ? (record as Record<string, unknown>)[key]
    : undefined;
}

function listValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim());
  }
  return [];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function passesCheck(check: CallCheck, value: unknown): boolean {
  if ("equals" in check) {
    return stableJson(check.equals) === stableJson(value);
  }
  if ("matches" in check) {
    return typeof value === "string" && new RegExp(check.matches, check.flags).test(value);
  }
  if ("notMatches" in check) {
    return !(typeof value === "string" && new RegExp(check.notMatches, check.flags).test(value));
  }
  if ("includes" in check) {
    return listValues(value).includes(check.includes);
  }
  return !listValues(value).includes(check.excludes);
}

function describeCheck(check: CallCheck): string {
  const { arg, param, ...rest } = check as CallCheck & { arg?: string; param?: string };
  const target = arg !== undefined ? `arg ${arg}` : `param ${param}`;
  return `${target} ${JSON.stringify(rest)}`;
}

function summarize(call: ToolCallRecord): string {
  return `${call.toolName}(${JSON.stringify(call.input ?? {})})`;
}

/**
 * Scores the model's first call to the expected tool. Every check must pass, and every
 * API request in the run must have matched a fixture.
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

  const scored = calls.find((call) => call.toolName === expectation.toolName);
  if (!scored) {
    const textSummary = modelText.length > 0 ? ` Model response: ${JSON.stringify(modelText)}.` : "";
    return {
      pass: false,
      score: 0,
      reason: `Never called ${expectation.toolName}. Observed: ${path}.${fixtureGap}${textSummary}`,
    };
  }

  const request = scored.requests?.[0]?.params;
  const failed = expectation.checks.filter((check) => {
    const value = "arg" in check ? field(scored.input, check.arg) : field(request, check.param);
    return !passesCheck(check, value);
  });
  const passedCount = expectation.checks.length - failed.length;
  const pass = failed.length === 0 && unmatched.length === 0;
  const requestSummary = request === undefined ? "" : ` Request: ${JSON.stringify(request)}.`;
  const errorSummary = scored.error ? ` Error: ${scored.error}.` : "";
  const failedSummary = failed.length > 0 ? ` Failed: ${failed.map(describeCheck).join("; ")}.` : "";

  return {
    pass,
    score: expectation.checks.length === 0 ? (pass ? 1 : 0) : passedCount / expectation.checks.length,
    reason: `${pass ? "All checks passed" : "Checks failed"} on ${summarize(scored)}. Observed: ${path}.${requestSummary}${errorSummary}${failedSummary}${fixtureGap}`,
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
