import { afterEach, describe, expect, it, vi } from "vitest";
import { callApi } from "../../src/shared";
import { tracer } from "../../src/tracing";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("callApi error telemetry", () => {
  it("attaches parsed API errors to the active tool span", async () => {
    const errorBody = JSON.stringify({ errors: ["Title can't be blank"] });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(errorBody, { status: 400, headers: { "Content-Type": "application/json" } }))
    );

    await tracer.runWithSpan("tool/create-financial-commitment-report", {}, async (span) => {
      const result = await callApi(
        "https://api.example",
        {},
        { title: "" } as never,
        "POST" as never,
        "/v2/financial_commitment_reports" as never
      );

      expect(result).toEqual({ ok: false, errors: ["Title can't be blank"] });
      expect(span.attributes["error.message"]).toBe(JSON.stringify(["Title can't be blank"]));
      expect(span.attributes["http.response.status_code"]).toBe(400);
    });
  });
});
