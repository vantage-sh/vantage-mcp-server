/// <reference path="../../worker-configuration.d.ts" />

import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import * as oauth from "oauth4webapi";
import { describe, expect, it, vi } from "vitest";
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

function makeProvider() {
  const env = { OAUTH_KV: makeKv() };
  const mcp = vi.fn(async () => new Response("mcp"));
  const sse = vi.fn(async () => new Response("sse"));
  const defaultHandler = vi.fn(async () => new Response("authorization reached"));
  const options: OAuthProviderOptions<typeof env> = {
    apiHandlers: { "/mcp": { fetch: mcp }, "/sse": { fetch: sse } },
    authorizeEndpoint: "/authorize",
    defaultHandler: { fetch: defaultHandler },
    tokenEndpoint: "/token",
  };
  const provider = new OAuthProvider(options);
  const router = createAuthRouter(provider, { fetch: mcp }, { fetch: sse });
  const fetch = (path: string, headers: HeadersInit = {}, init: RequestInit = {}) =>
    router.fetch(new Request(`https://mcp.example${path}`, { headers, ...init }), env, {} as ExecutionContext);
  return { defaultHandler, env, fetch, mcp, options, sse };
}

describe("OAuth provider behind the authentication router", () => {
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

  it.each(["/mcp", "/sse"])("rejects direct Vantage bearer access on %s", async (path) => {
    const { fetch, mcp, sse } = makeProvider();
    const response = await fetch(path, {
      Authorization: "Bearer vntg_tkn_example",
      "X-Vantage-Agent-Delegation": "delegation",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "invalid_token" });
    expect(mcp).not.toHaveBeenCalled();
    expect(sse).not.toHaveBeenCalled();
  });

  it("accepts an OAuth-issued bearer token on both API routes without forwarding agent headers", async () => {
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
  });
});
