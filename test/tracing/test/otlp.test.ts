import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOtlpExportPayload,
  buildSpanOutcome,
  type CompletedSpan,
  type ResolvedTracerConfig,
  toOtlpAttributes,
} from "../../../src/tracing/otlp";
import type { TraceSpan } from "../../../src/tracing/tracer";

const FIXED_NOW = 1_700_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildSpanOutcome", () => {
  it("returns default OK status with no events when no error", () => {
    const outcome = buildSpanOutcome(undefined, undefined);
    expect(outcome).toEqual({ events: [], status: { code: 0 } });
  });

  it("uses the provided status when no error", () => {
    const outcome = buildSpanOutcome(undefined, { code: 1, message: "ok" });
    expect(outcome).toEqual({ events: [], status: { code: 1, message: "ok" } });
  });

  it("turns an Error into an exception event with stacktrace", () => {
    const err = new TypeError("boom");
    const outcome = buildSpanOutcome(err, undefined);

    expect(outcome.events).toHaveLength(1);
    const [event] = outcome.events;
    expect(event.name).toBe("exception");
    expect(event.timeUnixNano).toBe(`${FIXED_NOW}000000`);
    expect(event.attributes).toEqual(
      expect.arrayContaining([
        { key: "exception.message", value: { stringValue: "boom" } },
        { key: "exception.type", value: { stringValue: "TypeError" } },
        expect.objectContaining({ key: "exception.stacktrace" }),
      ])
    );
    expect(outcome.status).toEqual({ code: 2, message: "boom" });
  });

  it("handles non-Error throwables", () => {
    const outcome = buildSpanOutcome("string failure", undefined);
    expect(outcome.events[0].attributes).toEqual([
      { key: "exception.message", value: { stringValue: "string failure" } },
      { key: "exception.type", value: { stringValue: "Error" } },
    ]);
    expect(outcome.status).toEqual({ code: 2, message: "string failure" });
  });

  it("prefers an explicit status over the default error status", () => {
    const outcome = buildSpanOutcome(new Error("ignored"), { code: 1, message: "kept" });
    expect(outcome.status).toEqual({ code: 1, message: "kept" });
  });
});

describe("toOtlpAttributes", () => {
  it("converts primitives to the right OTLP any-value shape", () => {
    expect(
      toOtlpAttributes({
        b: true,
        s: "hi",
        i: 42,
        f: 1.5,
      })
    ).toEqual([
      { key: "b", value: { boolValue: true } },
      { key: "s", value: { stringValue: "hi" } },
      { key: "i", value: { intValue: "42" } },
      { key: "f", value: { doubleValue: 1.5 } },
    ]);
  });

  it("wraps arrays in arrayValue", () => {
    expect(toOtlpAttributes({ tags: ["a", "b"] })).toEqual([
      {
        key: "tags",
        value: {
          arrayValue: {
            values: [{ stringValue: "a" }, { stringValue: "b" }],
          },
        },
      },
    ]);
  });

  it("drops undefined values", () => {
    expect(toOtlpAttributes({ keep: "yes", skip: undefined })).toEqual([
      { key: "keep", value: { stringValue: "yes" } },
    ]);
  });
});

describe("buildOtlpExportPayload", () => {
  const baseSpan: TraceSpan = {
    traceId: "0123456789abcdef0123456789abcdef",
    spanId: "0123456789abcdef",
    traceFlags: "01",
    sampled: true,
    name: "root",
    kind: "server",
    startedAt: FIXED_NOW - 100,
    attributes: {},
  };

  const baseConfig: ResolvedTracerConfig = {
    endpoint: "https://example.test/v1/traces",
    headers: {},
    resourceAttributes: { "deployment.environment.name": "test" },
    sampleRate: 1,
    serviceName: "svc",
  };

  it("emits a resource + scope spans structure with required identifiers", () => {
    const completed: CompletedSpan = {
      span: baseSpan,
      attributes: { "mcp.tool.name": "list" },
      outcome: { events: [], status: { code: 1 } },
      endedAt: FIXED_NOW,
    };

    const payload = JSON.parse(buildOtlpExportPayload([completed], baseConfig, { name: "scope" }));

    expect(payload).toMatchObject({
      resourceSpans: [
        {
          resource: {
            attributes: expect.arrayContaining([
              { key: "service.name", value: { stringValue: "svc" } },
              { key: "deployment.environment.name", value: { stringValue: "test" } },
            ]),
          },
          scopeSpans: [
            {
              scope: { name: "scope" },
              spans: [
                {
                  traceId: baseSpan.traceId,
                  spanId: baseSpan.spanId,
                  name: "root",
                  kind: 2,
                  startTimeUnixNano: `${baseSpan.startedAt}000000`,
                  endTimeUnixNano: `${FIXED_NOW}000000`,
                  status: { code: 1 },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("includes service.version when present and omits otherwise", () => {
    const withVersion = JSON.parse(
      buildOtlpExportPayload(
        [{ span: baseSpan, attributes: {}, outcome: { events: [], status: { code: 0 } }, endedAt: FIXED_NOW }],
        { ...baseConfig, serviceVersion: "1.2.3" },
        { name: "scope" }
      )
    );
    const resourceAttrs: Array<{ key: string }> = withVersion.resourceSpans[0].resource.attributes;
    expect(resourceAttrs.some((a) => a.key === "service.version")).toBe(true);

    const withoutVersion = JSON.parse(
      buildOtlpExportPayload(
        [{ span: baseSpan, attributes: {}, outcome: { events: [], status: { code: 0 } }, endedAt: FIXED_NOW }],
        baseConfig,
        { name: "scope" }
      )
    );
    const resourceAttrs2: Array<{ key: string }> = withoutVersion.resourceSpans[0].resource.attributes;
    expect(resourceAttrs2.some((a) => a.key === "service.version")).toBe(false);
  });

  it("includes parentSpanId only when set", () => {
    const child: TraceSpan = { ...baseSpan, parentSpanId: "fedcba9876543210" };
    const payload = JSON.parse(
      buildOtlpExportPayload(
        [{ span: child, attributes: {}, outcome: { events: [], status: { code: 0 } }, endedAt: FIXED_NOW }],
        baseConfig,
        { name: "scope" }
      )
    );
    expect(payload.resourceSpans[0].scopeSpans[0].spans[0].parentSpanId).toBe("fedcba9876543210");

    const rootPayload = JSON.parse(
      buildOtlpExportPayload(
        [{ span: baseSpan, attributes: {}, outcome: { events: [], status: { code: 0 } }, endedAt: FIXED_NOW }],
        baseConfig,
        { name: "scope" }
      )
    );
    expect(rootPayload.resourceSpans[0].scopeSpans[0].spans[0].parentSpanId).toBeUndefined();
  });

  it("includes events only when present", () => {
    const withEvents: CompletedSpan = {
      span: baseSpan,
      attributes: {},
      outcome: { events: [{ name: "exception" }], status: { code: 2 } },
      endedAt: FIXED_NOW,
    };
    const payload = JSON.parse(buildOtlpExportPayload([withEvents], baseConfig, { name: "scope" }));
    expect(payload.resourceSpans[0].scopeSpans[0].spans[0].events).toEqual([{ name: "exception" }]);
  });

  it("includes scope.version only when provided", () => {
    const payload = JSON.parse(
      buildOtlpExportPayload(
        [{ span: baseSpan, attributes: {}, outcome: { events: [], status: { code: 0 } }, endedAt: FIXED_NOW }],
        baseConfig,
        { name: "scope", version: "9.9.9" }
      )
    );
    expect(payload.resourceSpans[0].scopeSpans[0].scope).toEqual({ name: "scope", version: "9.9.9" });
  });

  it.each([
    ["server", 2],
    ["client", 3],
    ["producer", 4],
    ["consumer", 5],
    ["internal", 1],
  ] as const)("maps span kind %s to OTLP code %d", (kind, expected) => {
    const span: TraceSpan = { ...baseSpan, kind };
    const payload = JSON.parse(
      buildOtlpExportPayload(
        [{ span, attributes: {}, outcome: { events: [], status: { code: 0 } }, endedAt: FIXED_NOW }],
        baseConfig,
        { name: "scope" }
      )
    );
    expect(payload.resourceSpans[0].scopeSpans[0].spans[0].kind).toBe(expected);
  });
});
