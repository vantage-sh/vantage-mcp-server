import {
  GrantType,
  OAuthError,
  type OAuthHelpers,
  type TokenExchangeCallbackOptions,
} from "@cloudflare/workers-oauth-provider";
import { afterEach, describe, expect, it, vi } from "vitest";

import { tokenExchangeCallback } from "../../src/auth/token-exchange";

const auth0Env = {
  AUTH0_CLIENT_ID: "client-id",
  AUTH0_CLIENT_SECRET: "client-secret",
  AUTH0_DOMAIN: "auth0.example",
};

function refreshOptions(refreshToken?: string): TokenExchangeCallbackOptions {
  return {
    clientId: "mcp-client",
    grantId: "affected-grant",
    grantType: GrantType.REFRESH_TOKEN,
    props: {
      claims: { sub: "user-1" },
      tokenSet: {
        accessToken: "old-access-token",
        accessTokenTTL: 3600,
        idToken: "old-id-token",
        refreshToken,
      },
    },
    requestedScope: [],
    scope: [],
    userId: "user-1",
  };
}

function oauthHelpers() {
  const revokeGrant = vi.fn<OAuthHelpers["revokeGrant"]>().mockResolvedValue(undefined);
  return { helpers: { revokeGrant }, revokeGrant };
}

function mockAuth0(refreshResponse: Response | Error) {
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/.well-known/openid-configuration") {
      return Response.json({
        issuer: "https://auth0.example/",
        authorization_endpoint: "https://auth0.example/authorize",
        token_endpoint: "https://auth0.example/oauth/token",
      });
    }
    if (url.pathname === "/oauth/token") {
      if (refreshResponse instanceof Error) throw refreshResponse;
      return refreshResponse;
    }
    throw new Error(`Unexpected Auth0 request: ${url}`);
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tokenExchangeCallback refresh failures", () => {
  it("preserves the authorization code access token lifetime", async () => {
    const options = refreshOptions("valid-token");
    options.grantType = GrantType.AUTHORIZATION_CODE;
    const { helpers, revokeGrant } = oauthHelpers();

    await expect(tokenExchangeCallback(options, auth0Env, () => helpers)).resolves.toMatchObject({
      accessTokenTTL: 3600,
      newProps: options.props,
    });
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it("revokes only the affected grant and returns invalid_grant when the Auth0 token is missing", async () => {
    const { helpers, revokeGrant } = oauthHelpers();
    const getHelpers = vi.fn(() => helpers);

    const failure = tokenExchangeCallback(refreshOptions(), auth0Env, getHelpers);
    await expect(failure).rejects.toBeInstanceOf(OAuthError);
    await expect(failure).rejects.toMatchObject({
      code: "invalid_grant",
      statusCode: 400,
    } satisfies Partial<OAuthError>);
    expect(revokeGrant).toHaveBeenCalledExactlyOnceWith("affected-grant", "user-1");
  });

  it("revokes only the affected grant when Auth0 rejects a revoked refresh token", async () => {
    const fetch = mockAuth0(
      Response.json({ error: "invalid_grant", error_description: "Refresh token revoked" }, { status: 403 })
    );
    const { helpers, revokeGrant } = oauthHelpers();

    const failure = tokenExchangeCallback(refreshOptions("revoked-token"), auth0Env, () => helpers);
    await expect(failure).rejects.toBeInstanceOf(OAuthError);
    await expect(failure).rejects.toMatchObject({
      code: "invalid_grant",
      statusCode: 400,
    } satisfies Partial<OAuthError>);
    expect(revokeGrant).toHaveBeenCalledExactlyOnceWith("affected-grant", "user-1");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the grant and returns temporarily_unavailable for an Auth0 outage", async () => {
    mockAuth0(new Response("Unavailable", { status: 503, headers: { "Retry-After": "30" } }));
    const { helpers, revokeGrant } = oauthHelpers();

    const failure = tokenExchangeCallback(refreshOptions("valid-token"), auth0Env, () => helpers);
    await expect(failure).rejects.toBeInstanceOf(OAuthError);
    await expect(failure).rejects.toMatchObject({
      code: "temporarily_unavailable",
      statusCode: 503,
      headers: { "Retry-After": "30" },
    } satisfies Partial<OAuthError>);
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it("keeps the grant when the Auth0 request fails on the network", async () => {
    mockAuth0(new TypeError("network failure"));
    const { helpers, revokeGrant } = oauthHelpers();

    const failure = tokenExchangeCallback(refreshOptions("valid-token"), auth0Env, () => helpers);
    await expect(failure).rejects.toBeInstanceOf(OAuthError);
    await expect(failure).rejects.toMatchObject({
      code: "temporarily_unavailable",
      statusCode: 503,
    } satisfies Partial<OAuthError>);
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it("does not revoke the grant for an Auth0 client configuration error", async () => {
    mockAuth0(Response.json({ error: "invalid_client" }, { status: 401 }));
    const { helpers, revokeGrant } = oauthHelpers();

    await expect(tokenExchangeCallback(refreshOptions("valid-token"), auth0Env, () => helpers)).rejects.toMatchObject({
      error: "invalid_client",
    });
    expect(revokeGrant).not.toHaveBeenCalled();
  });

  it("preserves claims and the previous ID token when a successful refresh omits an ID token", async () => {
    mockAuth0(Response.json({ access_token: "new-access-token", token_type: "Bearer", expires_in: 1800 }));
    const { helpers, revokeGrant } = oauthHelpers();

    await expect(tokenExchangeCallback(refreshOptions("valid-token"), auth0Env, () => helpers)).resolves.toMatchObject({
      accessTokenTTL: 1800,
      newProps: {
        claims: { sub: "user-1" },
        tokenSet: {
          accessToken: "new-access-token",
          accessTokenTTL: 1800,
          idToken: "old-id-token",
          refreshToken: "valid-token",
        },
      },
    });
    expect(revokeGrant).not.toHaveBeenCalled();
  });
});
