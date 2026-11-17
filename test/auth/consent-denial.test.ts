import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { confirmConsent } from "../../src/auth";
import type { Auth0AuthRequest } from "../../src/auth/types";
import type { AppEnv } from "../../src/env";

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@cloudflare/workers-oauth-provider", () => ({ AuthorizationError: class extends Error {} }));

const TRANSACTION_STATE = "txn-state";
const CONSENT_TOKEN = "consent-token";

function authCookie(redirectUri: string): string {
  const payload: Auth0AuthRequest = {
    codeChallenge: "challenge",
    codeVerifier: "verifier",
    consentToken: CONSENT_TOKEN,
    mcpAuthRequest: {
      clientId: "client-id",
      redirectUri,
      responseType: "code",
      scope: ["openid"],
      state: "client-state",
      issuer: "https://hosted-mcp-staging.vantage.sh",
    },
    nonce: "nonce",
    transactionState: TRANSACTION_STATE,
  };
  return `auth0_req_${TRANSACTION_STATE}=${btoa(JSON.stringify(payload))}`;
}

async function deny(redirectUri: string, registeredUris: string[]) {
  const provider = {
    lookupClient: vi.fn().mockResolvedValue({
      clientId: "client-id",
      clientName: "Example",
      redirectUris: registeredUris,
    }),
  };
  const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();
  app.post("/authorize/consent", confirmConsent);
  const body = new URLSearchParams({
    consent_action: "deny",
    consent_token: CONSENT_TOKEN,
    transaction_state: TRANSACTION_STATE,
  });
  const response = await app.request(
    "https://hosted-mcp-staging.vantage.sh/authorize/consent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: authCookie(redirectUri),
      },
      body,
    },
    { ENVIRONMENT: "staging", OAUTH_PROVIDER: provider } as unknown as AppEnv & { OAUTH_PROVIDER: OAuthHelpers }
  );
  return { provider, response };
}

describe("consent denial redirect", () => {
  it("redirects a registered client back to its own URI with the OAuth error", async () => {
    const { provider, response } = await deny("https://app.example/callback", ["https://app.example/callback"]);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe("https://app.example");
    expect(location.pathname).toBe("/callback");
    expect(location.searchParams.get("error")).toBe("access_denied");
    expect(location.searchParams.get("error_description")).toBe("User denied the request");
    expect(location.searchParams.get("state")).toBe("client-state");
    expect(location.searchParams.get("iss")).toBe("https://hosted-mcp-staging.vantage.sh");
    expect(provider.lookupClient).toHaveBeenCalledWith("client-id");
  });

  it("encodes a hostile state value without changing the registered host", async () => {
    const payload = authCookie("https://app.example/callback").slice(`auth0_req_${TRANSACTION_STATE}=`.length);
    const parsed = JSON.parse(atob(payload)) as Auth0AuthRequest;
    parsed.mcpAuthRequest.state = "abc\r\nhttps://evil.example";
    const provider = {
      lookupClient: vi.fn().mockResolvedValue({
        clientId: "client-id",
        redirectUris: ["https://app.example/callback"],
      }),
    };
    const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();
    app.post("/authorize/consent", confirmConsent);
    const response = await app.request(
      "https://hosted-mcp-staging.vantage.sh/authorize/consent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `auth0_req_${TRANSACTION_STATE}=${btoa(JSON.stringify(parsed))}`,
        },
        body: new URLSearchParams({
          consent_action: "deny",
          consent_token: CONSENT_TOKEN,
          transaction_state: TRANSACTION_STATE,
        }),
      },
      { ENVIRONMENT: "staging", OAUTH_PROVIDER: provider } as unknown as AppEnv & { OAUTH_PROVIDER: OAuthHelpers }
    );
    const location = response.headers.get("location") ?? "";
    expect(new URL(location).hostname).toBe("app.example");
    expect(location).not.toMatch(/[\r\n]/);
    expect(new URL(location).searchParams.get("state")).toBe("abc\r\nhttps://evil.example");
  });

  it("follows a loopback client to the port it is listening on", async () => {
    const { response } = await deny("http://127.0.0.1:4312/callback", ["http://127.0.0.1/callback"]);
    const location = new URL(response.headers.get("location") ?? "");
    expect(response.status).toBe(302);
    expect(location.origin).toBe("http://127.0.0.1:4312");
    expect(location.pathname).toBe("/callback");
    expect(location.searchParams.get("error")).toBe("access_denied");
  });

  it.each([
    "https://evil.example/phish",
    "https://app.example.evil.example/callback",
    "https://app.example@evil.example/callback",
    "javascript:alert(1)",
    "https://app.example/callback.evil",
  ])("does not redirect a tampered cookie to %s", async (redirectUri) => {
    const { response } = await deny(redirectUri, ["https://app.example/callback"]);
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe("Invalid redirect URI");
  });

  it("does not redirect when the client no longer exists", async () => {
    const provider = { lookupClient: vi.fn().mockResolvedValue(null) };
    const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();
    app.post("/authorize/consent", confirmConsent);
    const response = await app.request(
      "https://hosted-mcp-staging.vantage.sh/authorize/consent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: authCookie("https://app.example/callback"),
        },
        body: new URLSearchParams({
          consent_action: "deny",
          consent_token: CONSENT_TOKEN,
          transaction_state: TRANSACTION_STATE,
        }),
      },
      { ENVIRONMENT: "staging", OAUTH_PROVIDER: provider } as unknown as AppEnv & { OAUTH_PROVIDER: OAuthHelpers }
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });
});
