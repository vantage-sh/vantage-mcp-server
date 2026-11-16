import { expect } from "vitest";
import tool from "../../../src/tools/codex-telemetry/begin-codex-telemetry-setup";
import type { ToolCallContext } from "../../../src/tools/structure/registerTool";
import { testTool } from "../../../src/utils/testing";

const response = {
  setup_code: "short-lived-setup-code",
  expires_at: "2026-11-16T12:05:00Z",
};

const apiCallHandler = (result: { ok: true; data: typeof response } | { ok: false; errors: unknown[] }) =>
  (async (endpoint, params, method) => {
    expect(endpoint).toBe("/v2/codex_telemetry_setup");
    expect(params).toEqual({});
    expect(method).toBe("POST");
    return result as never;
  }) as ToolCallContext["callVantageApi"];

testTool(
  tool,
  [{ name: "no arguments", data: {} }],
  [
    {
      name: "successful request",
      apiCallHandler: apiCallHandler({ ok: true, data: response }),
      handler: async ({ callExpectingSuccess }) => {
        expect(await callExpectingSuccess({})).toEqual(response);
      },
    },
    {
      name: "upstream rejection",
      apiCallHandler: apiCallHandler({ ok: false, errors: [{ message: "Not authorized" }] }),
      handler: async ({ callExpectingMCPUserError }) => {
        const error = await callExpectingMCPUserError({});
        expect(error.exception).toEqual({ errors: [{ message: "Not authorized" }] });
      },
    },
  ]
);
