import { describe, expect, it } from "vitest";
import {
  claimsUnrecognisedBrand,
  describeRedirectTarget,
  isRecognisedClient,
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

  it("does not recognise unknown names or mismatched redirects", () => {
    expect(isRecognisedClient("My Tool", ["https://example.com/cb"])).toBe(false);
    expect(isRecognisedClient("Claude", ["https://evil.example/cb"])).toBe(false);
    expect(isRecognisedClient(undefined, [])).toBe(false);
  });
});

describe("claimsUnrecognisedBrand", () => {
  it.each([
    ["Claude", ["https://evil.example/cb"]],
    ["Ｃｌａｕｄｅ Desktop", ["https://evil.example/cb"]],
    ["Cursor", ["https://www.cursor.com.evil.example/cb"]],
    ["Cursor", ["https://cursor.com/cb", "https://evil.example/cb"]],
  ])("flags %s with %j", (name, uris) => {
    expect(claimsUnrecognisedBrand(name, uris)).toBe(true);
  });

  it.each([
    ["Claude", ["https://claude.ai/api/mcp/auth_callback"]],
    ["Cursor", ["cursor://anysphere.cursor-mcp/oauth/callback", "https://www.cursor.com/agents/mcp/oauth/callback"]],
    ["pi", ["http://localhost:3118/callback"]],
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
