import { getOAuthApi, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { authorize } from "../../src/auth/authorization";
import type { AppEnv } from "../../src/env";

const chatgptRedirect = "https://chatgpt.com/connector/oauth/test-callback";
const otherRedirect = "https://other.example/callback";

async function registeredConsentPage(redirectUri: string) {
  const values = new Map<string, string>();
  const env = {
    AUTH0_SCOPE: "openid offline_access email",
    ENVIRONMENT: "staging",
    OAUTH_KV: {
      async get(key: string, options?: { type?: string }) {
        const value = values.get(key);
        return options?.type === "json" && value ? JSON.parse(value) : (value ?? null);
      },
      async put(key: string, value: string) {
        values.set(key, value);
      },
    },
  };
  const handler = { fetch: async () => new Response("ok") };
  const helpers = getOAuthApi(
    {
      apiHandler: handler,
      apiRoute: "/mcp",
      authorizeEndpoint: "/authorize",
      defaultHandler: handler,
      tokenEndpoint: "/token",
    },
    env
  );
  const client = await helpers.createClient({
    clientName: "ChatGPT",
    redirectUris: [chatgptRedirect, otherRedirect],
    tokenEndpointAuthMethod: "none",
  });
  const url = new URL("https://mcp.example/authorize");
  url.search = new URLSearchParams({
    client_id: client.clientId,
    code_challenge: "c".repeat(43),
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    response_type: "code",
  }).toString();
  const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();
  app.get("/authorize", authorize);
  return app.request(url.toString(), {}, { ...env, OAUTH_PROVIDER: helpers } as unknown as AppEnv & {
    OAUTH_PROVIDER: OAuthHelpers;
  });
}

describe("consent recognition with provider-validated redirects", () => {
  it("recognises the ChatGPT destination when the client also registers an unknown destination", async () => {
    const response = await registeredConsentPage(chatgptRedirect);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("ChatGPT");
    expect(html).not.toContain("Unverified application");
    expect(html).not.toContain("uses the name of a well-known client");
  });

  it("warns when the same client selects its registered unknown destination", async () => {
    const response = await registeredConsentPage(otherRedirect);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Unverified application");
    expect(html).toContain("uses the name of a well-known client");
    expect(html).toContain("other.example");
  });

  it("rejects an unregistered destination before showing consent", async () => {
    const response = await registeredConsentPage("https://chatgpt.com/connector/oauth/unregistered");
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid redirect URI");
  });
});
