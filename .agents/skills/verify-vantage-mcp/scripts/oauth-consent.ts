// Walks the client side of MCP OAuth against an oauth-mode Worker: challenge,
// discovery, dynamic client registration, and the consent screen. It stops at
// the consent screen because development Auth0 settings are placeholders.
//
// Usage: npx tsx oauth-consent.ts <run-dir>
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readRun } from "./support";

type CheckResult = { id: string; pass: boolean; detail?: string };
type Exchange = { status: number; headers: Record<string, string | string[]>; text: string };
type AuthorizationServerMetadata = {
  authorization_endpoint?: string;
  token_endpoint?: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
};
type Registration = Exchange & { body?: { client_id?: string; error?: string } };

const SSE_NOTICE = "Update your Vantage MCP connection";
const INSPECTOR_REDIRECT = "http://localhost:6274/oauth/callback";

function parseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

async function main(): Promise<number> {
  const runDir = process.argv[2];
  if (!runDir) {
    console.error("usage: npx tsx oauth-consent.ts <run-dir>");
    return 2;
  }
  const run = readRun(runDir);
  if (run.mode !== "oauth") {
    console.error(`run is in ${run.mode} mode; OAuth is bypassed there. Launch with: verify.sh launch oauth`);
    return 2;
  }
  const base = run.base;
  mkdirSync(join(run.dir, "evidence"), { recursive: true });
  const out = mkdtempSync(join(run.dir, "evidence", "oauth-consent-"));
  const exchangesPath = join(out, "exchanges.jsonl");
  writeFileSync(exchangesPath, "");

  const results: CheckResult[] = [];
  const check = (id: string, pass: unknown, detail?: string) => {
    results.push({ id, pass: !!pass, detail });
    console.log(`${pass ? "PASS" : "FAIL"}  ${id}${detail ? `  (${detail})` : ""}`);
  };
  const has = (html: string, text: string) => html.includes(text);

  async function exchange(label: string, url: string | URL, init: RequestInit = {}): Promise<Exchange> {
    const response = await fetch(url, { redirect: "manual", ...init });
    const text = await response.text();
    const headers: Exchange["headers"] = {};
    for (const name of ["content-type", "www-authenticate", "location"]) {
      const value = response.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    const cookies = response.headers.getSetCookie().map((cookie) => cookie.slice(0, cookie.indexOf("=")));
    if (cookies.length) headers["set-cookie (names only)"] = cookies;
    appendFileSync(
      exchangesPath,
      `${JSON.stringify({
        label,
        method: init.method ?? "GET",
        url: String(url),
        requestBody: typeof init.body === "string" ? parseJson(init.body) : undefined,
        status: response.status,
        headers,
        body: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
      })}\n`
    );
    return { status: response.status, headers, text };
  }

  // 1. An unauthenticated MCP request is challenged.
  const challenge = await exchange("challenge", `${base}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "verify", version: "1" } },
    }),
  });
  check("challenge-401", challenge.status === 401, `status ${challenge.status}`);
  const wwwAuthenticate = String(challenge.headers["www-authenticate"] ?? "");
  const advertised = /resource_metadata="([^"]+)"/.exec(wwwAuthenticate)?.[1];
  check("challenge-www-authenticate", /^Bearer/i.test(wwwAuthenticate) && advertised, wwwAuthenticate || "missing");

  // 2. Discovery.
  const prm = advertised ? await exchange("protected-resource-metadata", advertised) : undefined;
  check(
    "protected-resource-metadata",
    prm?.status === 200 && parseJson<{ resource?: string }>(prm.text)?.resource,
    advertised ? `${advertised} -> ${prm?.status}` : "missing resource_metadata in challenge; discovery not attempted"
  );

  const asm = await exchange("authorization-server-metadata", `${base}/.well-known/oauth-authorization-server`);
  const metadata = parseJson<AuthorizationServerMetadata>(asm.text) ?? {};
  check(
    "authorization-server-metadata",
    asm.status === 200 && metadata.authorization_endpoint && metadata.token_endpoint && metadata.registration_endpoint,
    `authorize=${metadata.authorization_endpoint} token=${metadata.token_endpoint} register=${metadata.registration_endpoint}`
  );
  check(
    "pkce-s256-advertised",
    (metadata.code_challenge_methods_supported ?? []).includes("S256"),
    JSON.stringify(metadata.code_challenge_methods_supported)
  );

  // 3. Dynamic client registration.
  async function register(label: string, clientMetadata: Record<string, unknown>): Promise<Registration> {
    const response = await exchange(label, metadata.registration_endpoint ?? `${base}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        ...clientMetadata,
      }),
    });
    return { ...response, body: parseJson(response.text) };
  }

  const local = await register("register-local-client", {
    client_name: "MCP Inspector (verify)",
    redirect_uris: [INSPECTOR_REDIRECT],
  });
  check("register-local-client", local.status === 201 && local.body?.client_id, `status ${local.status}`);

  const impostor = await register("register-unverified-client", {
    client_name: "Claude",
    redirect_uris: ["https://verify.example/callback"],
  });
  check("register-unverified-client", impostor.status === 201 && impostor.body?.client_id, `status ${impostor.status}`);

  const rejected = await register("register-rejected-client", {
    client_name: "Fragment client",
    redirect_uris: ["https://verify.example/callback#fragment"],
  });
  check(
    "register-rejects-invalid-redirect",
    rejected.status === 400 && rejected.body?.error === "invalid_client_metadata",
    `status ${rejected.status} ${rejected.body?.error ?? ""}`
  );

  // 4. Consent screen.
  function authorizeUrl(clientId: string, redirectUri: string, resource: string): URL {
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL(metadata.authorization_endpoint ?? `${base}/authorize`);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: randomBytes(8).toString("hex"),
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      resource,
    }).toString();
    return url;
  }

  async function consent(label: string, url: URL): Promise<Exchange> {
    const response = await exchange(label, url);
    writeFileSync(join(out, `${label}.html`), response.text);
    return response;
  }

  const localClientId = local.body?.client_id;
  if (localClientId) {
    const mcp = await consent("consent-mcp-resource", authorizeUrl(localClientId, INSPECTOR_REDIRECT, `${base}/mcp`));
    check(
      "consent-renders",
      mcp.status === 200 && has(mcp.text, "Authorization Request") && has(mcp.text, "Allow Access"),
      `status ${mcp.status}`
    );
    check("consent-names-client", has(mcp.text, "MCP Inspector (verify)"));
    check("consent-local-application-note", has(mcp.text, "Local application") && has(mcp.text, "localhost:6274"));
    check("consent-no-sse-notice-for-mcp", !has(mcp.text, SSE_NOTICE));
    check(
      "consent-form-carries-csrf-fields",
      /name="transaction_state"\s+value="[^"]+"/.test(mcp.text) && /name="consent_token"\s+value="[^"]+"/.test(mcp.text)
    );
    const cookies = mcp.headers["set-cookie (names only)"];
    check(
      "consent-sets-transaction-cookie",
      Array.isArray(cookies) && cookies.some((name) => name.startsWith("auth0_req_"))
    );

    const sse = await consent("consent-sse-resource", authorizeUrl(localClientId, INSPECTOR_REDIRECT, `${base}/sse`));
    check(
      "consent-sse-migration-notice",
      sse.status === 200 && has(sse.text, SSE_NOTICE) && has(sse.text, `${base}/mcp`)
    );
  }

  const impostorClientId = impostor.body?.client_id;
  if (impostorClientId) {
    const html = await consent(
      "consent-unverified-client",
      authorizeUrl(impostorClientId, "https://verify.example/callback", `${base}/mcp`)
    );
    check(
      "consent-unverified-warning",
      html.status === 200 && has(html.text, "Unverified application") && has(html.text, "verify.example")
    );
    check("consent-well-known-name-warning", has(html.text, "uses the name of a well-known client"));
  }

  const unknown = await exchange(
    "authorize-unknown-client",
    authorizeUrl("not-a-client", INSPECTOR_REDIRECT, `${base}/mcp`)
  );
  check(
    "authorize-rejects-unknown-client",
    unknown.status >= 400 && unknown.status < 500 && !has(unknown.text, "Allow Access"),
    `status ${unknown.status}`
  );

  const failed = results.filter((result) => !result.pass);
  writeFileSync(
    join(out, "summary.json"),
    `${JSON.stringify(
      {
        feature: "oauth-local-consent",
        entryPoint: "HTTP client walk (discovery, /register, /authorize)",
        baseUrl: base,
        gitSha: run.sha,
        finishedAt: new Date().toISOString(),
        passed: results.length - failed.length,
        failed: failed.length,
        results,
      },
      null,
      2
    )}\n`
  );
  console.log(`\n${results.length - failed.length}/${results.length} checks passed; evidence in ${out}`);
  return failed.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
