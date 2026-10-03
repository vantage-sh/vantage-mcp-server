import { tracer } from "./index";

/** Prefer the tool request's trace over a shared HTTP/session transport trace. */
export function mcpTraceContext(meta: Record<string, unknown> | undefined, headers?: HeadersInit) {
  const metadataHeaders =
    typeof meta?.traceparent === "string"
      ? {
          traceparent: meta.traceparent,
          ...(validTracestate(meta.tracestate) ? { tracestate: meta.tracestate as string } : {}),
        }
      : undefined;
  return tracer.extractTraceContext(metadataHeaders) ?? tracer.extractTraceContext(headers);
}

// Metadata is JSON, so unlike HTTP headers it can contain control characters.
// Ignore malformed state rather than letting it break a downstream Headers.set.
function validTracestate(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return false;
  const members = value.split(",");
  if (members.length > 32) return false;
  const keys = new Set<string>();
  return members.every((member) => {
    const [key, state, ...rest] = member.trim().split("=");
    if (!key || !state || rest.length || keys.has(key)) return false;
    if (!/^(?:[a-z][a-z0-9_*/-]{0,255}|[a-z0-9][a-z0-9_*/-]{0,240}@[a-z][a-z0-9_*/-]{0,13})$/.test(key)) return false;
    if (state.length > 256 || !/^[\x20-\x2b\x2d-\x3c\x3e-\x7e]*[\x21-\x2b\x2d-\x3c\x3e-\x7e]$/.test(state))
      return false;
    keys.add(key);
    return true;
  });
}
