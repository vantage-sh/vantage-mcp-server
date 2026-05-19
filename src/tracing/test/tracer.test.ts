import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../env";
import { CloudflareWorkerTracer } from "../tracer";

const FIXED_NOW = 1_700_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const appEnv = {
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example/v1/traces",
  OTEL_EXPORTER_OTLP_HEADERS: "x-api-key=secret",
} as unknown as AppEnv;

function makeTracer(overrides: Partial<ConstructorParameters<typeof CloudflareWorkerTracer>[0]> = {}) {
  return new CloudflareWorkerTracer({
    serviceName: "test-svc",
    scopeName: "test-scope",
    scopeVersion: "0.0.1",
    sampleRate: 1,
    ...overrides,
  });
}

describe("extractTraceContext", () => {
  const tracer = makeTracer();

  it("parses a valid traceparent and reads tracestate", () => {
    const ctx = tracer.extractTraceContext({
      traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      tracestate: "vendor=value",
    });
    expect(ctx).toEqual({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      traceFlags: "01",
      tracestate: "vendor=value",
      sampled: true,
    });
  });

  it("reads headers case-insensitively from a Request", () => {
    const request = new Request("https://example.test/x", {
      headers: { Traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00" },
    });
    const ctx = tracer.extractTraceContext(request);
    expect(ctx?.spanId).toBe("b7ad6b7169203331");
    expect(ctx?.sampled).toBe(false);
  });

  it("returns undefined when traceparent is missing or malformed", () => {
    expect(tracer.extractTraceContext(undefined)).toBeUndefined();
    expect(tracer.extractTraceContext({})).toBeUndefined();
    expect(tracer.extractTraceContext({ traceparent: "not-a-traceparent" })).toBeUndefined();
  });

  it("rejects all-zero traceIds and spanIds", () => {
    expect(
      tracer.extractTraceContext({ traceparent: "00-00000000000000000000000000000000-b7ad6b7169203331-01" })
    ).toBeUndefined();
    expect(
      tracer.extractTraceContext({ traceparent: "00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01" })
    ).toBeUndefined();
  });
});

describe("getTraceHeaders", () => {
  it("formats a W3C traceparent header from the active context", () => {
    const tracer = makeTracer();
    const headers = tracer.getTraceHeaders({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      traceFlags: "01",
      sampled: true,
      tracestate: "vendor=value",
    });
    expect(headers).toEqual({
      traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      tracestate: "vendor=value",
    });
  });

  it("omits tracestate when not set", () => {
    const tracer = makeTracer();
    const headers = tracer.getTraceHeaders({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      traceFlags: "00",
      sampled: false,
    });
    expect(headers).toEqual({
      traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00",
    });
  });

  it("returns undefined when there is no active context", () => {
    const tracer = makeTracer();
    expect(tracer.getTraceHeaders()).toBeUndefined();
  });
});

describe("startSpan", () => {
  it("generates a fresh trace and span id at the root", () => {
    const tracer = makeTracer();
    const span = tracer.startSpan("root");
    expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(span.parentSpanId).toBeUndefined();
    expect(span.kind).toBe("internal");
    expect(span.sampled).toBe(true);
    expect(span.traceFlags).toBe("01");
    expect(span.startedAt).toBe(FIXED_NOW);
  });

  it("inherits trace identity and tracestate from a parent", () => {
    const tracer = makeTracer();
    const span = tracer.startSpan("child", {
      parent: {
        traceId: "0af7651916cd43dd8448eb211c80319c",
        spanId: "b7ad6b7169203331",
        traceFlags: "01",
        sampled: true,
        tracestate: "vendor=value",
      },
    });
    expect(span.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(span.parentSpanId).toBe("b7ad6b7169203331");
    expect(span.tracestate).toBe("vendor=value");
    expect(span.sampled).toBe(true);
  });

  it("normalizes a dashed requestId into the traceId at the root", () => {
    const tracer = makeTracer();
    const span = tracer.startSpan("root", { requestId: "0AF76519-16CD-43DD-8448-EB211C80319C" });
    expect(span.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
  });

  it("ignores an unusable requestId and generates a new traceId", () => {
    const tracer = makeTracer();
    const allZero = tracer.startSpan("root", { requestId: "0".repeat(32) });
    expect(allZero.traceId).not.toBe("0".repeat(32));
    expect(allZero.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("marks span as not sampled when sampleRate is 0", () => {
    const tracer = makeTracer({ sampleRate: 0 });
    const span = tracer.startSpan("root");
    expect(span.sampled).toBe(false);
    expect(span.traceFlags).toBe("00");
  });

  it("strips undefined attribute values", () => {
    const tracer = makeTracer();
    const span = tracer.startSpan("root", {
      attributes: { keep: "yes", skip: undefined },
    });
    expect(span.attributes).toEqual({ keep: "yes" });
  });
});

describe("flush", () => {
  it("does not export unsampled spans", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ sampleRate: 0, exporterFetch: fetchSpy });

    await tracer.runWithSpan("root", { env: appEnv }, async () => undefined);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when no endpoint is configured", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    await tracer.runWithSpan("root", {}, async () => undefined);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs an OTLP payload to the configured endpoint with merged headers", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    await tracer.runWithSpan("root", { env: appEnv, attributes: { a: 1 } }, async () => undefined);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchSpy.mock.calls[0];
    expect(endpoint).toBe("https://collector.example/v1/traces");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toEqual({
      "Content-Type": "application/json",
      "x-api-key": "secret",
    });
    const body = JSON.parse((init as RequestInit).body as string);
    const attrs = body.resourceSpans[0].scopeSpans[0].spans[0].attributes as Array<{ key: string }>;
    expect(attrs.map((a) => a.key)).toContain("a");
  });

  it("sends dd-api-key header without mangling the value", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });
    const env = { ...appEnv, OTEL_EXPORTER_OTLP_HEADERS: "dd-api-key=asdf1234" } as unknown as AppEnv;

    await tracer.runWithSpan("root", { env }, async () => undefined);

    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toEqual({
      "Content-Type": "application/json",
      "dd-api-key": "asdf1234",
    });
  });

  it("URL-decodes header values from OTEL_EXPORTER_OTLP_HEADERS", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });
    const env = { ...appEnv, OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Bearer%20mytoken" } as unknown as AppEnv;

    await tracer.runWithSpan("root", { env }, async () => undefined);

    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer mytoken",
    });
  });

  it("does not throw when the exporter rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi.fn<typeof fetch>(async () => {
      throw new Error("network down");
    });
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    await expect(tracer.runWithSpan("root", { env: appEnv }, async () => undefined)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("isolates spans across concurrent root traces", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    await Promise.all([
      tracer.runWithSpan("trace-a", { env: appEnv }, async () => {
        await Promise.resolve();
      }),
      tracer.runWithSpan("trace-b", { env: appEnv }, async () => {
        await Promise.resolve();
      }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const call of fetchSpy.mock.calls) {
      const body = JSON.parse(call[1]?.body as string);
      expect(body.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
    }
  });

  it("hands the flush promise to waitUntil when provided", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });
    const handed: Promise<unknown>[] = [];
    const waitUntil = (p: Promise<unknown>) => handed.push(p);

    await tracer.runWithSpan("root", { env: appEnv, waitUntil }, async () => undefined);

    expect(handed).toHaveLength(1);
    await handed[0];
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("drops spans ended outside a traced root", () => {
    const tracer = makeTracer();
    const span = tracer.startSpan("orphan", { env: appEnv });
    // No active buffer in AsyncLocalStorage; endSpan should silently drop.
    expect(() => tracer.endSpan(span)).not.toThrow();
  });
});

describe("runWithSpan", () => {
  it("makes the span the active context for the duration of fn", async () => {
    const tracer = makeTracer({ exporterFetch: vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })) });

    expect(tracer.getActiveSpan()).toBeUndefined();
    const result = await tracer.runWithSpan("op", { env: appEnv }, async (span) => {
      expect(tracer.getActiveSpan()?.spanId).toBe(span.spanId);
      return 42;
    });
    expect(result).toBe(42);
    expect(tracer.getActiveSpan()).toBeUndefined();
  });

  it("flushes once at the root span only", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    await tracer.runWithSpan("root", { env: appEnv }, async () => {
      await tracer.runWithSpan("child", { env: appEnv }, async () => "inner");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.resourceSpans[0].scopeSpans[0].spans).toHaveLength(2);
  });

  it("records an exception event and rethrows on error", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    await expect(
      tracer.runWithSpan("op", { env: appEnv }, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const span = body.resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.status).toEqual({ code: 2, message: "boom" });
    expect(span.events[0].name).toBe("exception");
  });
});

describe("traceFetch", () => {
  it("injects a traceparent header derived from the parent span", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    const inner = vi.fn<typeof fetch>(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("traceparent")).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
      return new Response(null, { status: 200 });
    });

    await tracer.runWithSpan("root", { env: appEnv }, async (parent) => {
      await tracer.traceFetch(inner, "https://api.example/v1/cool", {}, { env: appEnv });
      // The child traceparent should share the same traceId as the parent.
      const seen = (inner.mock.calls[0][1] as RequestInit).headers as Headers;
      expect(seen.get("traceparent")?.split("-")[1]).toBe(parent.traceId);
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const fetchSpan = body.resourceSpans[0].scopeSpans[0].spans.find((s: { kind: number }) => s.kind === 3);
    expect(fetchSpan.status).toEqual({ code: 0 });
  });

  it("falls back to the input URL when the input is a Request", async () => {
    const tracer = makeTracer({ exporterFetch: vi.fn<typeof fetch>(async () => new Response(null, { status: 200 })) });

    const inner = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const request = new Request("https://api.example/v1/items", { method: "POST" });
    await tracer.traceFetch(inner, request, {}, { env: appEnv });

    expect(inner).toHaveBeenCalledTimes(1);
    const passed = inner.mock.calls[0][0] as Request;
    expect(passed).toBeInstanceOf(Request);
    expect(passed.method).toBe("POST");
    expect(passed.headers.get("traceparent")).toMatch(/^00-/);
  });

  it("records status 5xx as error severity", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    const inner = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }));
    await tracer.runWithSpan("root", { env: appEnv }, async () => {
      await tracer.traceFetch(inner, "https://api.example/down", {}, { env: appEnv });
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const fetchSpan = body.resourceSpans[0].scopeSpans[0].spans.find((s: { kind: number }) => s.kind === 3);
    expect(fetchSpan.status).toEqual({ code: 2, message: "HTTP 503" });
  });

  it("captures fetcher errors as an exception event", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    const inner = vi.fn<typeof fetch>(async () => {
      throw new Error("network down");
    });

    await expect(
      tracer.runWithSpan("root", { env: appEnv }, async () => {
        await tracer.traceFetch(inner, "https://api.example/x", {}, { env: appEnv });
      })
    ).rejects.toThrow("network down");

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const fetchSpan = body.resourceSpans[0].scopeSpans[0].spans.find((s: { kind: number }) => s.kind === 3);
    expect(fetchSpan.status).toEqual({ code: 2, message: "network down" });
    expect(fetchSpan.events[0].name).toBe("exception");
  });
});

describe("wrapFetchHandler", () => {
  function makeCtx(): ExecutionContext {
    return {
      waitUntil: (promise: Promise<unknown>) => {
        void promise;
      },
      passThroughOnException: () => undefined,
      props: {},
    } as unknown as ExecutionContext;
  }

  it("propagates the incoming traceparent into the span and out via response headers", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    const handler = tracer.wrapFetchHandler<AppEnv>(async () => new Response("ok", { status: 200 }));

    const incoming = new Request("https://svc.example/api", {
      headers: { traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" },
    });

    const response = await handler(incoming, appEnv, makeCtx());
    expect(response.headers.get("traceparent")).toMatch(/^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-01$/);

    // The streaming response defers flush via waitUntil; wait for the body to drain.
    await response.text();
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const span = body.resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(span.parentSpanId).toBe("b7ad6b7169203331");
    expect(span.kind).toBe(2);
    expect(span.status).toEqual({ code: 0 });
  });

  it("records and rethrows handler errors", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const tracer = makeTracer({ exporterFetch: fetchSpy });

    const handler = tracer.wrapFetchHandler<AppEnv>(async () => {
      throw new Error("handler boom");
    });

    await expect(handler(new Request("https://svc.example/api"), appEnv, makeCtx())).rejects.toThrow("handler boom");

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const span = body.resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.status).toEqual({ code: 2, message: "handler boom" });
  });
});
