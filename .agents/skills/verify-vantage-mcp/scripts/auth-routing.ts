import { createHash, randomBytes } from "node:crypto";
import { argumentsFor, fatal, Report, readRun, responsePreview, timeout } from "./support";

async function main(): Promise<number> {
  const { values, positionals } = argumentsFor({});
  if (values.help) {
    console.log(
      "Usage: npx tsx auth-routing.ts <run-dir>\nPresent empty Authorization must be rejected; only an absent header permits delegation."
    );
    return 0;
  }
  if (positionals.length !== 1) throw new Error("Pass one run directory; see --help");
  const run = readRun(positionals[0]);
  if (!["oauth", "staging"].includes(run.mode)) throw new Error("Auth routing requires OAuth enabled");
  const report = new Report(run, "auth-routing");
  report.evidence.emptyAuthorizationPolicy = "reject";
  const exchanges: unknown[] = [];
  report.evidence.exchanges = exchanges;
  const initialize = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "verify-vantage-mcp", version: "1" },
    },
  };
  async function check(
    id: string,
    path: string,
    headers: Record<string, string>,
    expected: number,
    method = "GET",
    body?: unknown
  ) {
    const response = await fetch(`${run.base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(timeout),
    });
    const text = await responsePreview(response);
    exchanges.push({
      id,
      path,
      method,
      requestHeaderNames: Object.keys(headers),
      requestBody: body,
      status: response.status,
      expectedStatus: expected,
      challenge: response.headers.get("www-authenticate"),
      body: text,
    });
    report.check(id, response.status === expected, `expected ${expected}, got ${response.status}`);
    return text;
  }
  try {
    for (const path of ["/mcp", "/sse"]) {
      const method = path === "/mcp" ? "POST" : "GET";
      const body = method === "POST" ? initialize : undefined;
      const cases: Record<string, Record<string, string>> = {
        missing: {},
        unknown: { "X-Vantage-Extra": "verify" },
        legacy: { "X-Vantage-Agent-Token": "verify" },
        "blank-delegation": { "X-Vantage-Agent-Delegation": "   " },
        bearer: { Authorization: "Bearer vntg_tkn_verification_invalid" },
        "bearer-and-delegation": {
          Authorization: "Bearer vntg_tkn_verification_invalid",
          "X-Vantage-Agent-Delegation": "verify-invalid",
        },
        "malformed-and-delegation": { Authorization: "Basic invalid", "X-Vantage-Agent-Delegation": "verify-invalid" },
        "empty-and-delegation": { Authorization: "", "X-Vantage-Agent-Delegation": "verify-invalid" },
        "whitespace-and-delegation": { Authorization: " \t ", "X-Vantage-Agent-Delegation": "verify-invalid" },
      };
      for (const [label, headers] of Object.entries(cases)) {
        const expected = label === "bearer" || label === "bearer-and-delegation" ? 200 : 401;
        await check(`${path}-${label}`, path, headers, expected, method, body);
      }
    }
    const delegation = { "X-Vantage-Agent-Delegation": "verify-invalid", "X-Vantage-Extra": "must-not-forward" };
    for (const path of ["/.well-known/oauth-authorization-server", "/.well-known/oauth-protected-resource/mcp", "/"]) {
      await check(`oauth-precedence-${path}`, path, delegation, 200);
    }
    for (const path of ["/mcpevil", "/sseevil"]) await check(`boundary-${path}`, path, delegation, 401);
    const redirect = "http://localhost:6274/oauth/callback";
    const registration = JSON.parse(
      await check("register-with-delegation", "/register", delegation, 201, "POST", {
        client_name: "MCP Inspector (verify routing)",
        redirect_uris: [redirect],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
      })
    );
    if (typeof registration.client_id !== "string") throw new Error("Registration did not return client_id");
    const query = new URLSearchParams({
      response_type: "code",
      client_id: registration.client_id,
      redirect_uri: redirect,
      state: randomBytes(16).toString("hex"),
      code_challenge: createHash("sha256").update(randomBytes(32)).digest("base64url"),
      code_challenge_method: "S256",
      resource: `${run.base}/mcp`,
    });
    await check("authorize-with-delegation", `/authorize?${query}`, delegation, 200);
    await check("delegation-initialize", "/mcp", delegation, 200, "POST", initialize);
    report.evidence.limit =
      "Initialize is transport proof; neither a Vantage-shaped bearer nor a delegation header proves successful Core authentication. Use tool calls to verify rejection or access; header allowlisting also needs tests or receiver-side evidence.";
    return report.finish();
  } catch (error) {
    return report.finish(error);
  }
}

main().then((code) => {
  process.exitCode = code;
}, fatal);
