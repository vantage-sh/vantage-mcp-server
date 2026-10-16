/// <reference path="../../worker-configuration.d.ts" />

import { describe, expect, it, vi } from "vitest";
import { createAuthRouter } from "../../src/auth/request-router";

function makeRouter() {
  const oauth = vi.fn(async () => new Response("oauth"));
  const mcp = vi.fn(async (_request: Request, _env: object, ctx: ExecutionContext) =>
    Response.json((ctx as ExecutionContext & { props?: object }).props)
  );
  const sse = vi.fn(async () => new Response("sse"));
  const router = createAuthRouter({ fetch: oauth }, { fetch: mcp }, { fetch: sse });
  const ctx = {} as ExecutionContext;
  const fetch = (path: string, headers: HeadersInit = {}) =>
    router.fetch(new Request(`https://mcp.example${path}`, { headers }), {}, ctx);
  return { ctx, fetch, mcp, oauth, sse };
}

describe("MCP authentication router", () => {
  it("routes only delegation-token MCP requests to the agent handler", async () => {
    const { fetch, mcp, oauth } = makeRouter();
    const response = await fetch("/mcp", {
      "X-Vantage-Agent-Delegation": "delegation",
      "X-Vantage-Extra": "must-not-forward",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      vantageHeaders: {
        "X-Vantage-Agent-Delegation": "delegation",
      },
    });
    expect(mcp).toHaveBeenCalledOnce();
    expect(oauth).not.toHaveBeenCalled();
  });

  it("retains the header-only agent path on the legacy SSE route", async () => {
    const { fetch, oauth, sse } = makeRouter();
    expect((await fetch("/sse/message", { "X-Vantage-Agent-Delegation": "delegation" })).status).toBe(200);
    expect(sse).toHaveBeenCalledOnce();
    expect(oauth).not.toHaveBeenCalled();
  });

  it.each(["/authorize", "/callback", "/.well-known/oauth-authorization-server", "/mcpevil"])(
    "keeps %s with the OAuth provider even when an agent header is present",
    async (path) => {
      const { fetch, mcp, oauth, sse } = makeRouter();
      expect(await (await fetch(path, { "X-Vantage-Agent-Delegation": "delegation" })).text()).toBe("oauth");
      expect(oauth).toHaveBeenCalledOnce();
      expect(mcp).not.toHaveBeenCalled();
      expect(sse).not.toHaveBeenCalled();
    }
  );

  const rejectedHeaders: Record<string, string>[] = [
    { Authorization: "Bearer vntg_tkn_example", "X-Vantage-Agent-Delegation": "delegation" },
    { Authorization: "Basic malformed", "X-Vantage-Agent-Delegation": "delegation" },
    { Authorization: "", "X-Vantage-Agent-Delegation": "delegation" },
    { "X-Vantage-Extra": "unrecognized" },
    { "X-Vantage-Agent-Delegation": "   " },
  ];

  it.each(rejectedHeaders)(
    "never lets an agent header shadow Authorization or create auth from unknown headers",
    async (headers) => {
      const { fetch, mcp, oauth, sse } = makeRouter();
      expect(await (await fetch("/mcp", headers)).text()).toBe("oauth");
      expect(oauth).toHaveBeenCalledOnce();
      expect(mcp).not.toHaveBeenCalled();
      expect(sse).not.toHaveBeenCalled();
    }
  );

  it("does not let Authorization shadowing bypass OAuth on the legacy SSE route", async () => {
    const { fetch, oauth, sse } = makeRouter();
    expect(
      await (
        await fetch("/sse/message", {
          Authorization: "Bearer vntg_tkn_example",
          "X-Vantage-Agent-Delegation": "delegation",
        })
      ).text()
    ).toBe("oauth");
    expect(oauth).toHaveBeenCalledOnce();
    expect(sse).not.toHaveBeenCalled();
  });
});
