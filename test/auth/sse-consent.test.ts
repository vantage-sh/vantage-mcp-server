import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { authorize } from "../../src/auth";
import type { AppEnv } from "../../src/env";

vi.mock("cloudflare:workers", () => ({ env: {} }));
// The provider's WorkerEntrypoint requires workerd. Consent tests supply its
// parsed request through OAuthHelpers and only need this error type in Node.
vi.mock("@cloudflare/workers-oauth-provider", () => ({ AuthorizationError: class extends Error {} }));

async function consentPage(resource?: string | string[]) {
  const provider = {
    parseAuthRequest: vi.fn().mockResolvedValue({
      clientId: "client-id",
      redirectUri: "http://localhost:3001/callback",
      scope: ["openid"],
      resource,
    }),
    lookupClient: vi.fn().mockResolvedValue({ clientId: "client-id", clientName: "Example MCP client" }),
  };
  const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();
  app.get("/authorize", authorize);
  const response = await app.request("https://hosted-mcp-staging.vantage.sh/authorize", {}, {
    AUTH0_SCOPE: "openid offline_access email",
    ENVIRONMENT: "staging",
    OAUTH_PROVIDER: provider,
  } as unknown as AppEnv & { OAUTH_PROVIDER: OAuthHelpers });
  return { response, html: await response.text() };
}

describe("SSE consent deprecation notice", () => {
  it("shows migration guidance for an explicit SSE resource while preserving consent forms", async () => {
    const { response, html } = await consentPage("https://hosted-mcp-staging.vantage.sh/sse");
    expect(response.status).toBe(200);
    expect(html).toContain("This client is connecting through the deprecated legacy SSE endpoint.");
    expect(html).toContain("<code>https://hosted-mcp-staging.vantage.sh/mcp</code>");
    expect(html).toContain("No shutdown date has been announced.");
    expect(html).toContain("Example MCP client");
    expect(html.match(/action="\/authorize\/consent"/g)).toHaveLength(2);
    expect(html.match(/name="consent_token"/g)).toHaveLength(2);
    expect(html.match(/name="transaction_state"/g)).toHaveLength(2);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it.each(["https://hosted-mcp-staging.vantage.sh/mcp", undefined, "https://another-server.example/sse"])(
    "does not show an SSE notice for resource %s",
    async (resource) => {
      const { response, html } = await consentPage(resource);
      expect(response.status).toBe(200);
      expect(html).not.toContain("This client is connecting through the deprecated legacy SSE endpoint.");
      expect(html).not.toContain("No shutdown date has been announced.");
    }
  );
});
