import type {
  Path,
  RequestBodyForPathAndMethod,
  ResponseBodyForPathAndMethod,
  SupportedMethods,
} from "@vantage-sh/vantage-client";
import type { ToolCallContext } from "../../src/tools/structure/registerTool";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type FixtureResult<P extends Path, M extends SupportedMethods<P>> =
  | { ok: true; data: ResponseBodyForPathAndMethod<P, M> }
  | { ok: false; errors: JsonValue[] };

/**
 * A canned Vantage API response. Fixtures match the request a tool handler sends,
 * after the handler has transformed the model's arguments.
 */
export type ApiFixture = {
  [P in Path]: {
    [M in SupportedMethods<P>]: {
      endpoint: P;
      method: M;
      /** Subset of the request params. Omit to match every request to this endpoint and method. */
      params?: { [key: string]: JsonValue };
      result: FixtureResult<P, M>;
    };
  }[SupportedMethods<P>];
}[Path];

export type ApiRequestRecord = {
  endpoint: string;
  method: string;
  params: JsonValue;
  matched: boolean;
};

export function isSubset(expected: JsonValue, actual: unknown): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((item, index) => isSubset(item, actual[index]))
    );
  }
  if (typeof expected === "object" && expected !== null) {
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      return false;
    }
    const record = actual as Record<string, unknown>;
    return Object.entries(expected).every(([key, value]) => key in record && isSubset(value, record[key]));
  }
  return Object.is(expected, actual);
}

function toJson(value: unknown): JsonValue {
  return value === undefined ? null : (JSON.parse(JSON.stringify(value)) as JsonValue);
}

/**
 * Serves the first fixture matching endpoint, method, and params, and records every request.
 * An unmatched request returns an API error, so the handler fails the way a rejected request would.
 */
export function createFixtureApi(
  fixtures: readonly ApiFixture[],
  requests: ApiRequestRecord[]
): ToolCallContext["callVantageApi"] {
  return async <
    P extends Path,
    M extends SupportedMethods<P>,
    Request extends RequestBodyForPathAndMethod<P, M>,
    Response extends ResponseBodyForPathAndMethod<P, M>,
  >(
    endpoint: P,
    params: Request,
    method: M
  ): Promise<{ data: Response; ok: true } | { errors: unknown[]; ok: false }> => {
    const sent = toJson(params);
    const fixture = fixtures.find(
      (candidate) =>
        candidate.endpoint === endpoint &&
        candidate.method === method &&
        (candidate.params === undefined || isSubset(candidate.params, sent))
    );
    requests.push({ endpoint, method, params: sent, matched: fixture !== undefined });

    if (!fixture) {
      return {
        ok: false,
        errors: [{ message: `No eval fixture matches ${method} ${endpoint} ${JSON.stringify(sent)}` }],
      };
    }
    return fixture.result as { data: Response; ok: true } | { errors: unknown[]; ok: false };
  };
}
