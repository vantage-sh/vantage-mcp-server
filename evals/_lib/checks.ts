import type { JsonValue } from "./apiFixtures";

type ValueCheck =
  | { equals: JsonValue }
  | { matches: string; flags?: string }
  | { notMatches: string; flags?: string }
  /** Arrays contain the value; strings are treated as comma-separated lists. */
  | { includes: string }
  | { excludes: string };

/**
 * `arg` reads the tool input after zod parsing, so defaults and transforms are applied.
 * `param` reads the API request the handler sent.
 */
export type CallCheck = ({ arg: string } | { param: string }) & ValueCheck;

export type CheckedCall = {
  input: unknown;
  params: unknown;
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

export function failedChecks(checks: readonly CallCheck[], call: CheckedCall): CallCheck[] {
  return checks.filter((check) => {
    const value = "arg" in check ? field(call.input, check.arg) : field(call.params, check.param);
    return !passesCheck(check, value);
  });
}

export function describeCheck(check: CallCheck): string {
  const { arg, param, ...rest } = check as CallCheck & { arg?: string; param?: string };
  const target = arg !== undefined ? `arg ${arg}` : `param ${param}`;
  return `${target} ${JSON.stringify(rest)}`;
}
