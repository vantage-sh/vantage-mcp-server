/// <reference path="../../worker-configuration.d.ts" />

import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../src/cf-worker";
import type { AppEnv } from "../../src/env";

vi.mock("agents/mcp", () => {
  const handler = {
    fetch: async (_request: Request, _env: unknown, ctx: ExecutionContext & { props?: unknown }) =>
      Response.json(ctx.props),
  };
  return {
    // biome-ignore lint/complexity/noStaticOnlyClass: The Worker subclasses McpAgent; only its transport is stubbed.
    McpAgent: class {
      static serve() {
        return handler;
      }
      static mount() {
        return handler;
      }
    },
  };
});

vi.mock("@sentry/cloudflare", () => ({
  withSentry: (_options: unknown, handler: unknown) => handler,
  captureMessage: vi.fn(),
}));

describe("hosted Worker authentication wiring", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["/mcp", "/sse"])(
    "passes API-token credentials through the deployed provider without a validation fetch on %s",
    async (path) => {
      const core = vi.fn(async () => Response.json({ bearer_token: { scope: ["read"] }, workspaces: [] }));
      vi.stubGlobal("fetch", core);
      const env = {
        VANTAGE_API_HOST: "https://core.example",
        SELF_CALLBACK_URL: "https://mcp.example/callback",
        CF_VERSION_METADATA: { id: "test" },
        OAUTH_KV: { get: vi.fn(async () => null) },
        OTEL_TRACES_SAMPLE_RATE: "0",
      } as unknown as AppEnv;
      const response = await worker.fetch(
        new Request(`https://mcp.example${path}`, {
          headers: { Authorization: "Bearer vntg_tkn_service", "X-Vantage-Agent-Delegation": "must-not-forward" },
        }),
        env,
        { waitUntil: vi.fn() } as unknown as ExecutionContext
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ tokenSet: { accessToken: "vntg_tkn_service" } });
      expect(core).not.toHaveBeenCalled();
    }
  );
});
