/// <reference path="../../worker-configuration.d.ts" />

import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import * as oauth from "oauth4webapi";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveVantageToken } from "../../src/auth/external-token";
import { createAuthRouter } from "../../src/auth/request-router";

function makeKv() {
  const values = new Map<string, string>();
  return {
    async get(key: string, options?: { type?: string }) {
      const value = values.get(key);
      return options?.type === "json" && value ? JSON.parse(value) : (value ?? null);
    },
    async put(key: string, value: string) {
      values.set(key, value);
    },
    async delete(key: string) {
      values.delete(key);
    },
    async list(options?: { prefix?: string }) {
      return {
        keys: [...values.keys()].filter((key) => key.startsWith(options?.prefix ?? "")).map((name) => ({ name })),
        list_complete: true,
      };
    },
  };
}

function makeProvider(resource?: string) {
  const env = { OAUTH_KV: makeKv(), VANTAGE_API_HOST: "https://core.example" };
  const mcp = vi.fn(async () => new Response("mcp"));
  const sse = vi.fn(async () => new Response("sse"));
  const defaultHandler = vi.fn(async () => new Response("authorization reached"));
  const options: OAuthProviderOptions<typeof env> = {
    apiHandlers: { "/mcp": { fetch: mcp }, "/sse": { fetch: sse } },
    authorizeEndpoint: "/authorize",
    clientRegistrationEndpoint: "/register",
    defaultHandler: { fetch: defaultHandler },
    tokenEndpoint: "/token",
    resolveExternalToken: resolveVantageToken,
    ...(resource ? { resourceMetadata: { resource } } : {}),
  };
  const provider = new OAuthProvider(options);
  const router = createAuthRouter(provider, { fetch: mcp }, { fetch: sse });
  const fetch = (path: string, headers: HeadersInit = {}, init: RequestInit = {}) =>
    router.fetch(new Request(`https://mcp.example${path}`, { headers, ...init }), env, {} as ExecutionContext);
  return { defaultHandler, env, fetch, mcp, options, sse };
}

describe("OAuth provider behind the authentication router", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serves OAuth discovery and authorization with agent headers present", async () => {
    const { defaultHandler, fetch, mcp, sse } = makeProvider();
    const headers = { "X-Vantage-Agent-Delegation": "delegation" };

    const discovery = await fetch("/.well-known/oauth-authorization-server", headers);
    expect(discovery.status).toBe(200);
    expect(await discovery.json()).toMatchObject({
      authorization_endpoint: "https://mcp.example/authorize",
      token_endpoint: "https://mcp.example/token",
    });
    expect((await fetch("/authorize", headers)).status).toBe(200);
    expect(defaultHandler).toHaveBeenCalledOnce();
    expect(mcp).not.toHaveBeenCalled();
    expect(sse).not.toHaveBeenCalled();
  });

  it.each(["/mcp", "/sse", "/sse/message"])(
    "passes service-token credentials to the handler without a validation fetch on %s",
    async (path) => {
      const core = vi.fn(async () => Response.json({ bearer_token: { scope: ["read"] }, workspaces: [] }));
      vi.stubGlobal("fetch", core);
      const { fetch, mcp, sse } = makeProvider();
      const response = await fetch(path, {
        Authorization: "Bearer vntg_tkn_service",
        "X-Vantage-Agent-Delegation": "must-not-forward",
        "X-Vantage-Scout-Token": "must-not-forward",
      });

      expect(response.status).toBe(200);
      expect(core).not.toHaveBeenCalled();
      const handler = path === "/mcp" ? mcp : sse;
      const ctx = (handler.mock.calls[0] as unknown as [Request, object, ExecutionContext])[2];
      expect(ctx).toHaveProperty("props.tokenSet.accessToken", "vntg_tkn_service");
      expect(ctx).not.toHaveProperty("props.vantageHeaders");
      expect(ctx).not.toHaveProperty("props.claims");
    }
  );

  it.each(["/mcp", "/sse"])("leaves invalid Vantage tokens for Core to reject on tool calls on %s", async (path) => {
    const core = vi.fn();
    vi.stubGlobal("fetch", core);
    const { fetch, mcp, sse } = makeProvider();
    const response = await fetch(path, {
      Authorization: "Bearer vntg_tkn_invalid",
      "X-Vantage-Agent-Delegation": "must-not-forward",
    });
    expect(response.status).toBe(200);
    expect(core).not.toHaveBeenCalled();
    const handler = path === "/mcp" ? mcp : sse;
    const ctx = (handler.mock.calls[0] as unknown as [Request, object, ExecutionContext])[2];
    expect(ctx).toHaveProperty("props.tokenSet.accessToken", "vntg_tkn_invalid");
    expect(ctx).not.toHaveProperty("props.vantageHeaders");
  });

  it.each(["not-a-vantage-token", "user:grant:unknown", "vntg_tkn_two words", "vntg_"])(
    "rejects %s without submitting it to Core",
    async (token) => {
      const core = vi.fn();
      vi.stubGlobal("fetch", core);
      const { fetch, mcp } = makeProvider();
      expect((await fetch("/mcp", { Authorization: `Bearer ${token}` })).status).toBe(401);
      expect(core).not.toHaveBeenCalled();
      expect(mcp).not.toHaveBeenCalled();
    }
  );

  it("keeps credentials isolated across requests without making validation requests", async () => {
    const core = vi.fn();
    vi.stubGlobal("fetch", core);
    const { fetch, mcp } = makeProvider();
    expect((await fetch("/mcp", { Authorization: "Bearer vntg_tkn_first" })).status).toBe(200);
    expect((await fetch("/mcp", { Authorization: "Bearer vntg_tkn_second" })).status).toBe(200);
    expect(core).not.toHaveBeenCalled();
    const contexts = mcp.mock.calls.map((call) => (call as unknown as [Request, object, ExecutionContext])[2]);
    expect(contexts[0]).toHaveProperty("props.tokenSet.accessToken", "vntg_tkn_first");
    expect(contexts[1]).toHaveProperty("props.tokenSet.accessToken", "vntg_tkn_second");
  });

  it("binds opaque token passthrough to the requested MCP resource for canonical metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response())
    );
    const { fetch, mcp, sse } = makeProvider("https://mcp.example/mcp");
    const headers = { Authorization: "Bearer vntg_tkn_service" };
    expect((await fetch("/mcp", headers)).status).toBe(200);
    expect((await fetch("/sse", headers)).status).toBe(401);
    expect(mcp).toHaveBeenCalledOnce();
    expect(sse).not.toHaveBeenCalled();
  });

  it("keeps bearer requests to discovery, authorization and registration with the OAuth endpoints", async () => {
    const core = vi.fn();
    vi.stubGlobal("fetch", core);
    const { fetch } = makeProvider();
    const headers = { Authorization: "Bearer vntg_tkn_example", "X-Vantage-Agent-Delegation": "delegation" };
    expect((await fetch("/.well-known/oauth-authorization-server", headers)).status).toBe(200);
    expect((await fetch("/authorize", headers)).status).toBe(200);
    expect(
      (
        await fetch("/register", headers, {
          method: "POST",
          body: JSON.stringify({ redirect_uris: ["http://localhost/callback"], token_endpoint_auth_method: "none" }),
        })
      ).status
    ).toBe(201);
    expect(core).not.toHaveBeenCalled();
  });

  it.each(["/mcp", "/sse"])(
    "rejects present empty or whitespace Authorization on %s without delegation fallback",
    async (path) => {
      for (const authorization of ["", " ", "\t"]) {
        const { fetch, mcp, sse } = makeProvider();
        const response = await fetch(path, {
          Authorization: authorization,
          "X-Vantage-Agent-Delegation": "delegation",
        });

        expect(response.status).toBe(401);
        expect(mcp).not.toHaveBeenCalled();
        expect(sse).not.toHaveBeenCalled();
      }
    }
  );

  it("routes to delegation only when Authorization is absent", async () => {
    const { fetch, mcp, sse } = makeProvider();
    expect((await fetch("/mcp", { "X-Vantage-Agent-Delegation": "delegation" })).status).toBe(200);
    expect(mcp).toHaveBeenCalledOnce();
    expect(sse).not.toHaveBeenCalled();
  });

  it("accepts an OAuth-issued bearer token on both API routes without forwarding agent headers", async () => {
    const core = vi.fn();
    vi.stubGlobal("fetch", core);
    const { env, fetch, mcp, options, sse } = makeProvider();
    const helpers = getOAuthApi(options, env);
    const client = await helpers.createClient({
      redirectUris: ["http://localhost/callback"],
      tokenEndpointAuthMethod: "none",
    });
    const verifier = "v".repeat(43);
    const authRequest = {
      clientId: client.clientId,
      codeChallenge: await oauth.calculatePKCECodeChallenge(verifier),
      codeChallengeMethod: "S256",
      redirectUri: "http://localhost/callback",
      responseType: "code",
      scope: [],
      state: "test-state",
    };
    const { redirectTo } = await helpers.completeAuthorization({
      metadata: {},
      props: { tokenSet: { accessToken: "upstream-token" } },
      request: authRequest,
      revokeExistingGrants: false,
      scope: [],
      userId: "user-1",
    });
    const code = new URL(redirectTo).searchParams.get("code")!;
    const exchange = await fetch(
      "/token",
      { "Content-Type": "application/x-www-form-urlencoded" },
      {
        body: new URLSearchParams({
          client_id: client.clientId,
          code,
          code_verifier: verifier,
          grant_type: "authorization_code",
          redirect_uri: authRequest.redirectUri,
        }),
        method: "POST",
      }
    );
    expect(exchange.status).toBe(200);
    const { access_token: accessToken } = (await exchange.json()) as { access_token: string };

    const headers = { Authorization: `Bearer ${accessToken}`, "X-Vantage-Agent-Delegation": "must-not-forward" };
    expect((await fetch("/mcp", headers)).status).toBe(200);
    expect((await fetch("/sse", headers)).status).toBe(200);
    expect(mcp).toHaveBeenCalledOnce();
    expect(sse).toHaveBeenCalledOnce();
    expect((mcp.mock.calls[0] as unknown as [Request, object, ExecutionContext])[2]).toHaveProperty(
      "props.tokenSet.accessToken",
      "upstream-token"
    );
    expect((mcp.mock.calls[0] as unknown as [Request, object, ExecutionContext])[2]).not.toHaveProperty(
      "props.vantageHeaders"
    );
    expect(core).not.toHaveBeenCalled();
  });
});
