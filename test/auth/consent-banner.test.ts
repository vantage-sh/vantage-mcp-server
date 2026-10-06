import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { authorize } from "../../src/auth";
import { isLoopbackRedirect } from "../../src/auth/client-policy";
import type { AppEnv } from "../../src/env";

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@cloudflare/workers-oauth-provider", () => ({ AuthorizationError: class extends Error {} }));

async function consentPage(clientName: string, redirectUri: string) {
  const provider = {
    parseAuthRequest: vi.fn().mockResolvedValue({ clientId: "client-id", redirectUri, scope: ["openid"] }),
    lookupClient: vi.fn().mockResolvedValue({ clientId: "client-id", clientName, redirectUris: [redirectUri] }),
  };
  const app = new Hono<{ Bindings: AppEnv & { OAUTH_PROVIDER: OAuthHelpers } }>();
  app.get("/authorize", authorize);
  const response = await app.request("https://hosted-mcp-staging.vantage.sh/authorize", {}, {
    AUTH0_SCOPE: "openid offline_access email",
    ENVIRONMENT: "staging",
    OAUTH_PROVIDER: provider,
  } as unknown as AppEnv & { OAUTH_PROVIDER: OAuthHelpers });
  return response.text();
}

describe("consent screen client warnings", () => {
  it("warns that an unknown remote redirect is unverified and names the host", async () => {
    const html = await consentPage("Acme Cost Reports", "https://attacker.example/cb");
    expect(html).toContain("Unverified application");
    expect(html).toContain("attacker.example");
    expect(html).not.toContain("Local application");
  });

  it("adds a stronger line when an unverified client borrows a well-known name", async () => {
    const html = await consentPage("Claude", "https://attacker.example/cb");
    expect(html).toContain("Unverified application");
    expect(html).toContain("uses the name of a well-known client");
    const plain = await consentPage("Acme Cost Reports", "https://attacker.example/cb");
    expect(plain).not.toContain("uses the name of a well-known client");
  });

  it("shows a milder local-application note for loopback redirects", async () => {
    const html = await consentPage("pi", "http://localhost:3118/callback");
    expect(html).toContain("Local application");
    expect(html).toContain("localhost:3118");
    expect(html).not.toContain("Unverified application");
  });

  it("shows no notice for a recognised client on its own redirect", async () => {
    const html = await consentPage("Claude", "https://claude.ai/api/mcp/auth_callback");
    expect(html).not.toContain("Unverified application");
    expect(html).not.toContain("Local application");
  });

  it("escapes the client name", async () => {
    const html = await consentPage("<script>alert(1)</script>", "https://attacker.example/cb");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("isLoopbackRedirect", () => {
  it.each(["http://localhost:3000/cb", "http://127.0.0.1/cb", "http://[::1]:8080/cb"])("accepts %s", (uri) => {
    expect(isLoopbackRedirect(uri)).toBe(true);
  });

  it.each([
    "https://localhost/cb",
    "http://localhost.attacker.example/cb",
    "https://attacker.example/cb",
    "cursor://x/y",
    "nope",
  ])("rejects %s", (uri) => {
    expect(isLoopbackRedirect(uri)).toBe(false);
  });
});
