import { describe, expect, it } from "vitest";
import { mcpTraceContext } from "../../src/tracing/mcp-context";

const metadataParent = "00-11111111111111111111111111111111-2222222222222222-01";
const headerParent = "00-33333333333333333333333333333333-4444444444444444-01";

describe("MCP metadata tracing", () => {
  it("prefers request metadata to HTTP headers", () => {
    expect(
      mcpTraceContext({ traceparent: metadataParent, tracestate: "vendor=value" }, { traceparent: headerParent })
    ).toMatchObject({ traceId: "1".repeat(32), spanId: "2".repeat(16), tracestate: "vendor=value" });
  });
  it.each([
    undefined,
    {},
    { traceparent: 123 },
    { traceparent: "invalid" },
    { traceparent: "00-00000000000000000000000000000000-2222222222222222-01" },
  ])("falls back to HTTP headers for invalid/absent metadata %#", (meta) => {
    expect(mcpTraceContext(meta, { traceparent: headerParent })).toMatchObject({
      traceId: "3".repeat(32),
      spanId: "4".repeat(16),
    });
  });
  it("supports stdio metadata without HTTP headers", () => {
    expect(mcpTraceContext({ traceparent: metadataParent, tracestate: 12 })).toMatchObject({
      traceId: "1".repeat(32),
      tracestate: undefined,
    });
    expect(mcpTraceContext({ traceparent: "bad" })).toBeUndefined();
  });
});

it.each([
  "vendor=value\r\nInjected: x",
  "vendor=x,vendor=y",
  "invalid key=x",
  "vendor=x=y",
  "vendor=",
  `vendor=${"x".repeat(257)}`,
])("ignores malformed metadata tracestate %s", (tracestate) => {
  expect(mcpTraceContext({ traceparent: metadataParent, tracestate })).toMatchObject({
    traceId: "1".repeat(32),
    tracestate: undefined,
  });
});
