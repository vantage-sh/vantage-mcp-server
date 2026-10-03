import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import * as oauth from "oauth4webapi";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderConsentScreen } from "../../src/auth/consent-screen";
import { canonicalOAuthRedirect, resourceMetadataOptions } from "../../src/auth/resource-metadata";

function makeProvider(callbackUrl = "https://mcp.vantage.sh/callback", enabled = "true") {
  const values = new Map<string, string>();
  const env = {
    OAUTH_KV: {
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
          keys: [...values.keys()].filter((name) => name.startsWith(options?.prefix ?? "")).map((name) => ({ name })),
          list_complete: true,
        };
      },
    },
  };
  const handler = { fetch: async () => new Response("ok") };
  const options: OAuthProviderOptions<typeof env> = {
    ...resourceMetadataOptions({ SELF_CALLBACK_URL: callbackUrl, MCP_OAUTH_METADATA_ENABLED: enabled }),
    apiHandlers: { "/mcp": handler, "/sse": handler },
    authorizeEndpoint: "/authorize",
    clientRegistrationEndpoint: "/register",
    clientRegistrationTTL: undefined,
    refreshTokenTTL: undefined,
    defaultHandler: handler,
    tokenEndpoint: "/token",
  };
  return { provider: new OAuthProvider(options), helpers: getOAuthApi(options, env), env, values };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("canonical protected resource metadata", () => {
  it.each([
    ["http://localhost:8787/callback", "http://localhost:8787"],
    ["https://hosted-mcp-staging.vantage.sh/callback", "https://hosted-mcp-staging.vantage.sh"],
    ["https://mcp.vantage.sh/callback", "https://mcp.vantage.sh"],
  ])("publishes the configured resource for %s", async (callbackUrl, origin) => {
    const { provider, env } = makeProvider(callbackUrl);
    const response = await provider.fetch(new Request(`${origin}/.well-known/oauth-protected-resource/mcp`), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      resource_name: "Vantage Hosted MCP Server",
    });
  });

  it("uses the canonical production resource on the legacy hostname", async () => {
    const { provider, env } = makeProvider();
    const response = await provider.fetch(
      new Request("https://hosted-mcp-prod.vantage.sh/.well-known/oauth-protected-resource/mcp"),
      env
    );
    expect(await response.json()).toMatchObject({
      resource: "https://mcp.vantage.sh/mcp",
      authorization_servers: ["https://mcp.vantage.sh"],
    });
    const challenge = await provider.fetch(new Request("https://hosted-mcp-prod.vantage.sh/mcp"), env);
    expect(challenge.status).toBe(401);
    expect(challenge.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://hosted-mcp-prod.vantage.sh/.well-known/oauth-protected-resource/mcp"'
    );
  });

  it("leaves legacy behavior in place unless explicitly enabled", async () => {
    expect(resourceMetadataOptions({ SELF_CALLBACK_URL: "https://mcp.vantage.sh/callback" })).toEqual({});
    expect(
      resourceMetadataOptions({
        SELF_CALLBACK_URL: "https://mcp.vantage.sh/callback",
        MCP_OAUTH_METADATA_ENABLED: "false",
      })
    ).toEqual({});
    const { provider, env } = makeProvider(undefined, "false");
    const response = await provider.fetch(
      new Request("https://mcp.vantage.sh/.well-known/oauth-protected-resource/mcp"),
      env
    );
    expect(await response.json()).toMatchObject({ resource: "https://mcp.vantage.sh/mcp" });
  });

  it("retains DCR and requires the exact canonical resource", async () => {
    const { provider, helpers, env } = makeProvider();
    const registration = await provider.fetch(
      new Request("https://mcp.vantage.sh/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "DCR client",
          redirect_uris: ["http://localhost/callback"],
          token_endpoint_auth_method: "none",
        }),
      }),
      env
    );
    expect(registration.status).toBe(201);
    const { client_id: clientId } = (await registration.json()) as { client_id: string };
    const authUrl = (resource?: string) => {
      const url = new URL("https://mcp.vantage.sh/authorize");
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: "http://localhost/callback",
        response_type: "code",
        code_challenge: "v".repeat(43),
        code_challenge_method: "S256",
        ...(resource ? { resource } : {}),
      }).toString();
      return new Request(url);
    };
    const parsed = await helpers.parseAuthRequest(authUrl());
    expect(parsed.resource).toBe("https://mcp.vantage.sh/mcp");
    await expect(helpers.parseAuthRequest(authUrl("https://mcp.vantage.sh/sse"))).rejects.toMatchObject({
      code: "invalid_target",
    });
    await expect(helpers.parseAuthRequest(authUrl("https://hosted-mcp-prod.vantage.sh/mcp"))).rejects.toMatchObject({
      code: "invalid_target",
    });
  });
});

describe("CIMD provider integration", () => {
  const clientId = "https://client.example/metadata.json";
  const metadata = {
    client_id: clientId,
    client_name: "CIMD client",
    redirect_uris: ["http://localhost/callback"],
    token_endpoint_auth_method: "none",
  };
  function enablePublicFetch() {
    vi.stubGlobal("Cloudflare", { compatibilityFlags: { global_fetch_strictly_public: true } });
  }

  it("resolves valid metadata without creating a DCR record", async () => {
    enablePublicFetch();
    const fetch = vi.fn().mockResolvedValue(Response.json(metadata));
    vi.stubGlobal("fetch", fetch);
    const { helpers, values } = makeProvider();
    expect(await helpers.lookupClient(clientId)).toMatchObject({
      clientId,
      clientName: "CIMD client",
      redirectUris: ["http://localhost/callback"],
    });
    expect(fetch).toHaveBeenCalledWith(clientId, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(values.size).toBe(0);
  });

  it.each([
    { ...metadata, client_id: "https://other.example/metadata.json" },
    { ...metadata, redirect_uris: [] },
    { ...metadata, client_secret: "not-allowed" },
  ])("rejects invalid metadata %#", async (document) => {
    enablePublicFetch();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(document)));
    await expect(makeProvider().helpers.lookupClient(clientId)).rejects.toThrow();
  });

  it("does not fetch CIMD without the public-fetch runtime flag", async () => {
    vi.stubGlobal("Cloudflare", { compatibilityFlags: {} });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(makeProvider().helpers.lookupClient(clientId)).rejects.toThrow("global_fetch_strictly_public");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propagates a public-fetch rejection", async () => {
    enablePublicFetch();
    const fetch = vi.fn().mockRejectedValue(new TypeError("public fetch blocked private address"));
    vi.stubGlobal("fetch", fetch);
    await expect(makeProvider().helpers.lookupClient("https://private.example/metadata.json")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

it("shows the CIMD identity domain with escaped client text", async () => {
  const html = await renderConsentScreen({
    clientId: "https://client.example:8443/metadata.json",
    clientName: "<script>fake</script>",
    clientLogo: "",
    clientUri: "",
    redirectUri: "http://localhost/callback",
    requestedScopes: [],
    transactionState: "state",
    consentToken: "token",
  }).toString();
  expect(html).toContain("Client ID domain: <strong>client.example:8443</strong>");
  expect(html).not.toContain("<script>fake</script>");
  expect(html).toContain("&lt;script&gt;fake&lt;/script&gt;");
});

describe("canonical audience migration", () => {
  it.each([undefined, "https://mcp.vantage.sh/sse"])("handles an existing grant for %s", async (resource) => {
    const legacy = makeProvider(undefined, "false");
    const canonical = makeProvider();
    const client = await legacy.helpers.createClient({
      redirectUris: ["http://localhost/callback"],
      tokenEndpointAuthMethod: "none",
    });
    const verifier = "v".repeat(43);
    const request = {
      clientId: client.clientId,
      redirectUri: "http://localhost/callback",
      responseType: "code",
      scope: [],
      state: "state",
      codeChallenge: await oauth.calculatePKCECodeChallenge(verifier),
      codeChallengeMethod: "S256",
      ...(resource ? { resource } : {}),
    };
    const { redirectTo } = await legacy.helpers.completeAuthorization({
      request,
      userId: "user",
      scope: [],
      metadata: {},
      props: { user: "user" },
    });
    const tokenRequest = (params: Record<string, string>) =>
      new Request("https://mcp.vantage.sh/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: client.clientId, ...params }),
      });
    const issued = await legacy.provider.fetch(
      tokenRequest({
        grant_type: "authorization_code",
        code: new URL(redirectTo).searchParams.get("code")!,
        code_verifier: verifier,
        redirect_uri: request.redirectUri,
      }),
      legacy.env
    );
    expect(issued.status, await issued.clone().text()).toBe(200);
    const token = (await issued.json()) as { access_token: string; refresh_token: string };
    const call = (accessToken: string, origin = "https://mcp.vantage.sh") =>
      new Request(`${origin}/mcp`, { headers: { Authorization: `Bearer ${accessToken}` } });
    expect((await canonical.provider.fetch(call(token.access_token), legacy.env, {} as ExecutionContext)).status).toBe(
      401
    );
    const refreshed = await canonical.provider.fetch(
      tokenRequest({ grant_type: "refresh_token", refresh_token: token.refresh_token }),
      legacy.env
    );
    if (resource) {
      expect(refreshed.status).toBe(400);
      expect(await refreshed.json()).toMatchObject({ error: "invalid_target" });
    } else {
      expect(refreshed.status).toBe(200);
      const { access_token: accessToken } = (await refreshed.json()) as { access_token: string };
      expect((await canonical.provider.fetch(call(accessToken), legacy.env, {} as ExecutionContext)).status).toBe(200);
      expect(
        (
          await canonical.provider.fetch(
            call(accessToken, "https://hosted-mcp-prod.vantage.sh"),
            legacy.env,
            {} as ExecutionContext
          )
        ).status
      ).toBe(401);
    }
  });
});

it("redirects the production alias with its method, path and query preserved", () => {
  const env = {
    ENVIRONMENT: "production" as const,
    SELF_CALLBACK_URL: "https://mcp.vantage.sh/callback",
    MCP_OAUTH_METADATA_ENABLED: "true",
  };
  const request = new Request("https://hosted-mcp-prod.vantage.sh/token?key=value", { method: "POST" });
  const redirect = canonicalOAuthRedirect(request, env)!;
  expect(redirect.status).toBe(308);
  expect(redirect.headers.get("location")).toBe("https://mcp.vantage.sh/token?key=value");
  expect(canonicalOAuthRedirect(request, { ...env, MCP_OAUTH_METADATA_ENABLED: undefined })).toBeUndefined();
  expect(canonicalOAuthRedirect(request, { ...env, ENVIRONMENT: "staging" })).toBeUndefined();
  expect(canonicalOAuthRedirect(new Request("https://mcp.vantage.sh/mcp"), env)).toBeUndefined();
  expect(canonicalOAuthRedirect(new Request("https://unknown.example/mcp"), env)).toBeUndefined();
});
