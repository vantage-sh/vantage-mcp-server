import { describe, expect, it } from "vitest";
import {
  claimsUnrecognisedBrand,
  describeRedirectTarget,
  isRecognisedClient,
  isRecognisedRedirect,
  resolveRegisteredRedirect,
  validateClientRegistration,
} from "../../src/auth/client-policy";

describe("validateClientRegistration", () => {
  it.each([
    [{ client_name: "Claude", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }],
    [{ client_name: "Cursor", redirect_uris: ["cursor://anysphere.cursor-retrieval/oauth/callback"] }],
    [
      {
        client_name: "Cursor",
        redirect_uris: [
          "cursor://anysphere.cursor-mcp/oauth/callback",
          "https://www.cursor.com/agents/mcp/oauth/callback",
          "http://localhost:8787/callback",
        ],
      },
    ],
    // Brand-named clients with unknown redirects register; they are warned about, not blocked.
    [{ client_name: "Claude", redirect_uris: ["https://evil.example/cb"] }],
    [{ client_name: "Cursor", redirect_uris: ["https://www.cursor.com.evil.example/cb"] }],
    [{ client_name: "My Tool", redirect_uris: ["https://example.com/cb"] }],
    [{ client_name: "Local", redirect_uris: ["http://127.0.0.1:3000/callback"] }],
    [{ client_name: "ChatGPT", redirect_uris: ["https://chatgpt.com/connector/oauth/cb_123"] }],
    [{ client_name: "VS Code", redirect_uris: ["https://insiders.vscode.dev/redirect"] }],
    // Unlisted paths on vendor hosts still register, so new vendor callbacks keep working.
    [{ client_name: "Claude", redirect_uris: ["https://claude.ai/some/new/callback?x=1"] }],
    [{ client_name: "ChatGPT", redirect_uris: ["https://chatgpt.com/connector/oauth"] }],
  ])("allows %j", (metadata) => {
    expect(validateClientRegistration(metadata)).toBeUndefined();
  });

  it.each([
    [{ client_name: "x", redirect_uris: ["http://evil.example/cb"] }],
    [{ client_name: "x", redirect_uris: ["https://user:pw@example.com/cb"] }],
    [{ client_name: "x", redirect_uris: ["https://example.com/cb#frag"] }],
    [{ client_name: "x", redirect_uris: ["not a url"] }],
    [{ client_name: "Claude‮", redirect_uris: ["https://example.com/cb"] }],
    [{ client_name: "a".repeat(101), redirect_uris: ["https://example.com/cb"] }],
  ])("rejects %j", (metadata) => {
    expect(validateClientRegistration(metadata)).toEqual(expect.any(String));
  });
});

describe("isRecognisedClient", () => {
  it("recognises a known client on its own redirect", () => {
    expect(isRecognisedClient("Claude", ["https://claude.ai/api/mcp/auth_callback"])).toBe(true);
  });

  it("does not recognise unknown names, loopback, or mismatched redirects", () => {
    expect(isRecognisedClient("My Tool", ["https://example.com/cb"])).toBe(false);
    expect(isRecognisedClient("Claude", ["https://evil.example/cb"])).toBe(false);
    expect(isRecognisedClient("Claude", ["http://localhost:9999/callback"])).toBe(false);
    expect(isRecognisedClient("VS Code", ["http://127.0.0.1:33418/"])).toBe(false);
    expect(isRecognisedClient(undefined, [])).toBe(false);
  });

  it("ignores loopback URIs registered alongside a known client's own redirects", () => {
    expect(
      isRecognisedClient("Cursor", [
        "cursor://anysphere.cursor-mcp/oauth/callback",
        "https://www.cursor.com/agents/mcp/oauth/callback",
        "http://localhost:8787/callback",
      ])
    ).toBe(true);
    expect(isRecognisedClient("Claude", ["http://localhost:9999/callback", "https://evil.example/cb"])).toBe(false);
  });

  it("recognises a cursor custom-scheme callback and a dynamic ChatGPT callback", () => {
    expect(isRecognisedClient("Cursor", ["cursor://anysphere.cursor-retrieval/oauth/callback"])).toBe(true);
    expect(isRecognisedClient("ChatGPT", ["https://chatgpt.com/connector/oauth/cb_123"])).toBe(true);
  });
});

describe("isRecognisedRedirect", () => {
  it("judges only the redirect used by this request", () => {
    expect(isRecognisedRedirect("Cursor", "https://www.cursor.com/agents/mcp/oauth/callback")).toBe(true);
    expect(isRecognisedRedirect("Cursor", "http://localhost:8787/callback")).toBe(false);
    expect(isRecognisedRedirect("My Tool", "https://claude.ai/api/mcp/auth_callback")).toBe(false);
  });
});

describe("claimsUnrecognisedBrand", () => {
  it.each([
    ["Claude", ["https://evil.example/cb"]],
    ["Ｃｌａｕｄｅ Desktop", ["https://evil.example/cb"]],
    ["Claude", ["http://localhost:9999/callback", "https://evil.example/cb"]],
    ["Cursor", ["https://www.cursor.com.evil.example/cb"]],
    ["Cursor", ["https://cursor.com/cb", "https://evil.example/cb"]],
  ])("flags %s with %j", (name, uris) => {
    expect(claimsUnrecognisedBrand(name, uris)).toBe(true);
  });

  it.each([
    ["Claude", ["https://claude.ai/api/mcp/auth_callback"]],
    ["Cursor", ["cursor://anysphere.cursor-mcp/oauth/callback", "https://www.cursor.com/agents/mcp/oauth/callback"]],
    ["pi", ["http://localhost:3118/callback"]],
    ["Claude Code", ["http://localhost:9999/callback"]],
    [
      "Cursor",
      [
        "cursor://anysphere.cursor-mcp/oauth/callback",
        "https://www.cursor.com/agents/mcp/oauth/callback",
        "http://localhost:8787/callback",
      ],
    ],
    ["Acme Cost Reports", ["https://evil.example/cb"]],
  ])("does not flag %s with %j", (name, uris) => {
    expect(claimsUnrecognisedBrand(name, uris)).toBe(false);
  });
});

describe("describeRedirectTarget", () => {
  it("shows the host for web URIs and the scheme for custom schemes", () => {
    expect(describeRedirectTarget("https://evil.example:8443/cb?x=1")).toBe("evil.example:8443");
    expect(describeRedirectTarget("cursor://anysphere.cursor-retrieval/oauth")).toBe("anysphere.cursor-retrieval");
  });
});

describe("resolveRegisteredRedirect", () => {
  const registered = [
    "https://app.example/callback",
    "https://app.example/callback?foo=1",
    "cursor://anysphere.cursor-mcp/oauth/callback",
    "http://127.0.0.1/callback",
    "http://localhost:8787/callback",
    "http://[::1]/callback",
  ];

  it("returns the registered https URI, not the requested string", () => {
    const redirect = resolveRegisteredRedirect("https://app.example/callback", registered);
    expect(redirect?.href).toBe("https://app.example/callback");
    expect(redirect?.hostname).toBe("app.example");
  });

  it("keeps a registered query and a custom scheme", () => {
    expect(resolveRegisteredRedirect("https://app.example/callback?foo=1", registered)?.href).toBe(
      "https://app.example/callback?foo=1"
    );
    expect(resolveRegisteredRedirect("cursor://anysphere.cursor-mcp/oauth/callback", registered)?.protocol).toBe(
      "cursor:"
    );
  });

  it("allows a different loopback port and builds the URL from the registered host", () => {
    expect(resolveRegisteredRedirect("http://127.0.0.1:4312/callback", registered)?.href).toBe(
      "http://127.0.0.1:4312/callback"
    );
    expect(resolveRegisteredRedirect("http://localhost:9999/callback", registered)?.href).toBe(
      "http://localhost:9999/callback"
    );
    expect(resolveRegisteredRedirect("http://[::1]:4545/callback", registered)?.href).toBe(
      "http://[::1]:4545/callback"
    );
    expect(resolveRegisteredRedirect("http://localhost/callback", registered)?.href).toBe("http://localhost/callback");
    // Decimal form of 127.0.0.1 still resolves to the registered loopback URI.
    expect(resolveRegisteredRedirect("http://2130706433/callback", registered)?.href).toBe("http://127.0.0.1/callback");
  });

  it.each([
    "https://evil.example/callback",
    "https://app.example.evil.example/callback",
    "https://evilapp.example/callback",
    "https://app.example/callback.evil",
    "https://app.example/callback/../callback",
    "https://app.example@evil.example/callback",
    "https://user:pass@app.example/callback",
    "https://app.example/callback#frag",
    "https://evil.example#https://app.example/callback",
    "http://evil.example/callback",
    "http://localhost.evil.example/callback",
    "http://127.0.0.1.evil.example/callback",
    "http://127.0.0.1@evil.example/callback",
    "https://app.example:8443/callback",
    "http://127.0.0.1/other",
    "//evil.example/callback",
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "https://app.example/callback\r\nLocation: https://evil.example",
    "https://app.example\\@evil.example/callback",
    "not a url",
    "",
  ])("rejects %s", (requested) => {
    expect(resolveRegisteredRedirect(requested, registered)).toBeNull();
  });

  it("rejects a dangerous scheme even when it is the registered value", () => {
    expect(resolveRegisteredRedirect("javascript:alert(1)", ["javascript:alert(1)"])).toBeNull();
    expect(resolveRegisteredRedirect("http://evil.example/callback", ["http://evil.example/callback"])).toBeNull();
  });

  it("rejects a loopback request whose path or query differs from the registration", () => {
    expect(resolveRegisteredRedirect("http://127.0.0.1:4312/other", registered)).toBeNull();
    expect(
      resolveRegisteredRedirect("http://127.0.0.1:4312/callback?next=https://evil.example", registered)
    ).toBeNull();
    expect(resolveRegisteredRedirect("http://localhost/callback", ["http://127.0.0.1/callback"])).toBeNull();
  });
});
