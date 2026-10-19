import { join } from "node:path";
import { discoverAuthorizationServerMetadata, refreshAuthorization } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { smoke } from "./mcp-client";
import { argumentsFor, fatal, privateJson, Report, readRun, savePrivate, timeout } from "./support";

async function main(): Promise<number> {
  const { values, positionals } = argumentsFor({
    "credentials-file": { type: "string" },
    "resource-path": { type: "string" },
  });
  if (values.help) {
    console.log(`Usage: npx tsx oauth-refresh.ts <run-dir> --credentials-file PATH [--resource-path /mcp|/sse]
Private input JSON (permissions 600): {"client":{"client_id":"..."},"tokens":{"refresh_token":"..."}}
Optional resource must match the selected resource URL. Obtain credentials through the approved real OAuth flow.
Makes one refresh attempt, saves rotated credentials under state/, and calls the matching transport. Does not deploy or log in.`);
    return 0;
  }
  if (positionals.length !== 1 || !values["credentials-file"])
    throw new Error("Provide run directory and --credentials-file");
  const path = String(values["resource-path"] ?? "/mcp");
  if (!["/mcp", "/sse"].includes(path)) throw new Error("Resource path must be /mcp or /sse");
  const run = readRun(positionals[0]);
  if (run.mode === "token") throw new Error("Token-mode runs bypass OAuth");
  const report = new Report(run, "oauth-refresh");
  try {
    const input = privateJson(String(values["credentials-file"])) as {
      client: OAuthClientInformationMixed;
      tokens: OAuthTokens;
      resource?: string;
    };
    if (!input.client?.client_id || !input.tokens?.refresh_token)
      throw new Error("Input needs client.client_id and tokens.refresh_token");
    const resource = new URL(path, run.base);
    if (input.resource && input.resource !== resource.href)
      throw new Error("Credential resource does not match the selected transport");
    const boundedFetch: typeof fetch = (url, init) =>
      fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(timeout) });
    const metadata = await discoverAuthorizationServerMetadata(run.base, { fetchFn: boundedFetch });
    if (!metadata?.token_endpoint || new URL(metadata.token_endpoint).origin !== run.base) {
      throw new Error("Token endpoint must belong to the verified Worker origin");
    }
    const exchanges: unknown[] = [];
    report.evidence.exchanges = exchanges;
    const tokens = await refreshAuthorization(run.base, {
      metadata,
      clientInformation: input.client,
      refreshToken: input.tokens.refresh_token,
      resource,
      fetchFn: async (url, init) => {
        const response = await boundedFetch(url, init);
        const body = (await response.clone().json()) as Record<string, unknown>;
        exchanges.push({
          url: String(url),
          method: init?.method,
          grantType: "refresh_token",
          resource: resource.href,
          status: response.status,
          tokenType: body.token_type,
          expiresIn: body.expires_in,
          hasAccessToken: typeof body.access_token === "string",
          hasRefreshToken: typeof body.refresh_token === "string",
          error: body.error,
          errorDescription: body.error_description,
        });
        report.write();
        return response;
      },
    });
    const output = join(run.dir, "state", `oauth-refreshed-${Date.now()}-${process.pid}.json`);
    // Preserve the rotated token before any later assertion or MCP call can fail.
    savePrivate(output, { client: input.client, tokens, resource: resource.href });
    // Register rotated credentials for redaction before handling subsequent errors.
    privateJson(output);
    report.evidence.rotatedCredentials = "Saved privately under state/; remove at cleanup or use for the next refresh";
    console.log(`Private rotated credentials: ${output}`);
    report.check("refresh-token-grant", !!tokens.access_token);
    report.check(
      "refresh-token-rotation",
      !!tokens.refresh_token && tokens.refresh_token !== input.tokens.refresh_token
    );
    await smoke(run, report, {
      transports: [path === "/sse" ? "sse" : "http"],
      expect: "success",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "X-Vantage-Agent-Delegation": "must-not-override-oauth",
      },
    });
    return report.finish();
  } catch (error) {
    return report.finish(error); // Do not retry invalid_grant on shared staging.
  }
}

main().then((code) => {
  process.exitCode = code;
}, fatal);
