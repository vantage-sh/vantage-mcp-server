import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import * as oauth from "oauth4webapi";
import { describe, expect, it } from "vitest";
import { tokenExchangeCallback } from "../../src/auth/token-exchange";

const auth0Env = {
  AUTH0_CLIENT_ID: "client-id",
  AUTH0_CLIENT_SECRET: "client-secret",
  AUTH0_DOMAIN: "auth0.example",
};

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

describe("OAuth refresh endpoint", () => {
  it("returns invalid_grant, revokes one grant, and allows a new authorization", async () => {
    const env = { ...auth0Env, OAUTH_KV: makeKv() };
    const handler = { fetch: async () => new Response("ok") };
    const providerOptions: OAuthProviderOptions<typeof env> = {
      apiHandler: handler,
      apiRoute: "/mcp",
      authorizeEndpoint: "/authorize",
      defaultHandler: handler,
      tokenEndpoint: "/token",
      tokenExchangeCallback: (options) => tokenExchangeCallback(options, env, () => getOAuthApi(providerOptions, env)),
    };
    const provider = new OAuthProvider(providerOptions);
    const helpers = getOAuthApi(providerOptions, env);
    const client = await helpers.createClient({
      redirectUris: ["http://localhost/callback"],
      tokenEndpointAuthMethod: "none",
    });
    const verifier = "v".repeat(43);
    const request = {
      clientId: client.clientId,
      codeChallenge: await oauth.calculatePKCECodeChallenge(verifier),
      codeChallengeMethod: "S256",
      redirectUri: "http://localhost/callback",
      responseType: "code",
      scope: [],
      state: "test-state",
    };
    const props = { claims: { sub: "user-1" }, tokenSet: { accessToken: "auth0-access", accessTokenTTL: 3600 } };
    const authorize = async () => {
      const { redirectTo } = await helpers.completeAuthorization({
        metadata: {},
        props,
        request,
        revokeExistingGrants: false,
        scope: [],
        userId: "user-1",
      });
      return new URL(redirectTo).searchParams.get("code")!;
    };
    const postToken = async (params: Record<string, string>) =>
      provider.fetch(
        new Request("https://mcp.example/token", {
          body: new URLSearchParams({ client_id: client.clientId, ...params }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          method: "POST",
        }),
        env
      );

    const code = await authorize();
    const otherCode = await authorize();
    expect((await helpers.listUserGrants("user-1")).items).toHaveLength(2);

    const codeResponse = await postToken({
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: request.redirectUri,
    });
    expect(codeResponse.status).toBe(200);
    const { refresh_token: refreshToken } = (await codeResponse.json()) as { refresh_token: string };

    const refreshResponse = await postToken({ grant_type: "refresh_token", refresh_token: refreshToken });
    expect(refreshResponse.status).toBe(400);
    expect(await refreshResponse.json()).toMatchObject({ error: "invalid_grant" });
    expect((await helpers.listUserGrants("user-1")).items).toHaveLength(1);

    const newCodeResponse = await postToken({
      code: otherCode,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: request.redirectUri,
    });
    expect(newCodeResponse.status).toBe(200);
  });
});
