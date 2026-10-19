import { smoke, type TransportName } from "./mcp-client";
import { argumentsFor, credential, fatal, privateJson, Report, readRun } from "./support";

async function main(): Promise<number> {
  const { values, positionals } = argumentsFor({
    transports: { type: "string" },
    auth: { type: "string" },
    expect: { type: "string" },
    "token-file": { type: "string" },
    "delegation-token-file": { type: "string" },
    "oauth-token-file": { type: "string" },
    mutate: { type: "boolean" },
  });
  if (values.help) {
    console.log(`Usage: npx tsx mcp-smoke.ts <run-dir> [options]
  --transports http,sse,stdio    Default: http,sse
  --auth dev|delegation|invalid-delegation|oauth    Default: dev
  --expect success|core-error   Default: success
  --token-file PATH             Core token for stdio (or VERIFY_VANTAGE_TOKEN)
  --delegation-token-file PATH  Or VERIFY_AGENT_DELEGATION_TOKEN
  --oauth-token-file PATH       Private JSON containing access_token or tokens.access_token
  --mutate                     Local-only folder create/read/delete; requires http
Use one transport per OAuth invocation, with a token scoped to that resource.`);
    return 0;
  }
  if (positionals.length !== 1) throw new Error("Pass one run directory; see --help");
  const transports = String(values.transports ?? "http,sse").split(",");
  if (
    !transports.length ||
    transports.some((name) => !["http", "sse", "stdio"].includes(name)) ||
    new Set(transports).size !== transports.length
  )
    throw new Error("Invalid transports");
  const expect = values.expect ?? "success";
  if (expect !== "success" && expect !== "core-error") throw new Error("Invalid expectation");
  const auth = values.auth ?? "dev";
  if (!["dev", "delegation", "invalid-delegation", "oauth"].includes(String(auth)))
    throw new Error("Invalid auth mode");
  if (values.mutate && (expect !== "success" || !transports.includes("http")))
    throw new Error("Mutations require successful HTTP calls");
  if (auth === "oauth" && (transports.length !== 1 || transports.includes("stdio")))
    throw new Error("Select one OAuth resource transport");
  if (auth !== "dev" && transports.includes("stdio")) throw new Error("Stdio uses the Core token; select --auth dev");
  const run = readRun(positionals[0]);
  if (auth === "dev" && transports.some((name) => name !== "stdio") && run.mode !== "token") {
    throw new Error("--auth dev hosted calls require a token-mode run");
  }
  if (auth !== "dev" && run.mode === "token") throw new Error("Token mode bypasses the auth path being tested");
  const report = new Report(run, "mcp-smoke");
  try {
    const headers: Record<string, string> = {};
    if (auth === "delegation" || auth === "invalid-delegation") {
      headers["X-Vantage-Agent-Delegation"] =
        auth === "delegation"
          ? credential("VERIFY_AGENT_DELEGATION_TOKEN", values["delegation-token-file"] as string | undefined)
          : "verify-deliberately-invalid-delegation";
      if (auth === "invalid-delegation" && expect !== "core-error")
        throw new Error("Invalid delegation requires --expect core-error");
    } else if (auth === "oauth") {
      if (!values["oauth-token-file"]) throw new Error("Provide --oauth-token-file");
      const input = privateJson(String(values["oauth-token-file"])) as {
        access_token?: string;
        tokens?: { access_token?: string };
      };
      const token = input.tokens?.access_token ?? input.access_token;
      if (!token) throw new Error("OAuth token file has no access_token");
      headers.Authorization = `Bearer ${token}`;
    }
    const token = transports.includes("stdio")
      ? credential("VERIFY_VANTAGE_TOKEN", values["token-file"] as string | undefined)
      : undefined;
    report.evidence.options = { auth, expect, transports, mutate: !!values.mutate };
    await smoke(run, report, {
      transports: transports as TransportName[],
      headers,
      token,
      expect,
      mutate: !!values.mutate,
    });
    return report.finish();
  } catch (error) {
    return report.finish(error);
  }
}

main().then((code) => {
  process.exitCode = code;
}, fatal);
