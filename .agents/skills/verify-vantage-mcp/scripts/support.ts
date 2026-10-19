import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

export const repoRoot = resolve(__dirname, "../../../..");
export const timeout = 15_000;
const secrets = new Set<string>();

export function redact(value: unknown): string {
  let text = typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? String(value));
  for (const secret of secrets) text = text.replaceAll(secret, "<redacted>");
  return text.replace(/Bearer\s+(?![A-Za-z_]+=(?:\\)?["'])[A-Za-z0-9._~+/-]+=*/gi, "Bearer <redacted>");
}

export function credential(envName: string, file?: string): string {
  if (file && (statSync(file).mode & 0o077) !== 0) throw new Error("Credential file must have permissions 600");
  const value = (file ? readFileSync(file, "utf8") : (process.env[envName] ?? "")).trim();
  if (!value || /\s/.test(value)) throw new Error(`Set ${envName} or provide a plaintext token file`);
  secrets.add(value);
  return value;
}

export function privateJson(file: string): unknown {
  if ((statSync(file).mode & 0o077) !== 0) throw new Error("Credential file must have permissions 600");
  const value = JSON.parse(readFileSync(file, "utf8"));
  const remember = (entry: unknown): void => {
    if (!entry || typeof entry !== "object") return;
    for (const [key, item] of Object.entries(entry)) {
      if (/token|secret|verifier/i.test(key) && typeof item === "string") secrets.add(item);
      else remember(item);
    }
  };
  remember(value);
  return value;
}

export function savePrivate(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify(value), { mode: 0o600, flag: "wx" });
}

export function loopback(url: string): boolean {
  const parsed = new URL(url);
  return ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) && parsed.protocol === "http:";
}

export type Run = { dir: string; base: string; sha: string; mode: string; apiHost?: string; local: boolean };

export function readRun(directory: string): Run {
  const dir = realpathSync(directory);
  const parent = realpathSync(join(repoRoot, "tmp/verify-vantage-mcp"));
  const path = relative(parent, dir);
  if (!path || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path))
    throw new Error("Use a working verification folder");
  const env = Object.fromEntries(
    readFileSync(join(dir, "run.env"), "utf8")
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
  );
  const url = new URL(env.BASE_URL);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("BASE_URL must be an HTTP(S) origin without credentials");
  }
  if (!env.GIT_SHA || !env.MODE) throw new Error("run.env needs GIT_SHA and MODE");
  const local = loopback(url.origin);
  if (local) {
    if (!/^[1-9]\d+$/.test(env.PGID ?? "") || Number(env.PGID) <= 1) throw new Error("Local runs need an owned PGID");
    execFileSync(join(__dirname, "verify.sh"), ["doctor", dir], { cwd: repoRoot, stdio: "inherit" });
  } else if (env.MODE !== "staging" || url.protocol !== "https:") {
    throw new Error("Remote runs require MODE=staging and HTTPS; confirm the approved deployment before driving");
  }
  return { dir, base: url.origin, sha: env.GIT_SHA, mode: env.MODE, apiHost: env.API_HOST, local };
}

export function argumentsFor<const T extends Record<string, { type: "string" | "boolean" }>>(options: T) {
  return parseArgs({ options: { help: { type: "boolean" as const }, ...options }, allowPositionals: true });
}

export class Report {
  readonly dir: string;
  readonly results: { id: string; status: "passed" | "failed" | "skipped"; detail?: string }[] = [];
  readonly evidence: Record<string, unknown> = {};
  private finishedAt?: string;

  constructor(
    readonly run: Run,
    readonly feature: string
  ) {
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    const parent = join(run.dir, "evidence");
    mkdirSync(parent, { recursive: true });
    this.dir = mkdtempSync(join(parent, `${feature}-${stamp}-`));
    this.write();
  }

  check(id: string, pass: unknown, detail?: string): void {
    this.results.push({ id, status: pass ? "passed" : "failed", detail });
    console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? ` (${redact(detail)})` : ""}`);
    this.write();
  }

  skip(id: string, detail: string): void {
    this.results.push({ id, status: "skipped", detail });
    this.write();
  }

  finish(error?: unknown): number {
    if (error) this.check("execution", false, error instanceof Error ? error.message : String(error));
    this.finishedAt = new Date().toISOString();
    this.write();
    console.log(`Report: ${join(this.dir, "SUMMARY.md")}`);
    return this.results.some((result) => result.status === "failed") ? 1 : 0;
  }

  write(): void {
    const count = (status: string) => this.results.filter((result) => result.status === status).length;
    const summary = {
      feature: this.feature,
      gitSha: this.run.sha,
      entryPoint: this.run.base,
      finishedAt: this.finishedAt,
      passed: count("passed"),
      failed: count("failed"),
      skipped: count("skipped"),
      results: this.results,
      evidence: this.evidence,
    };
    writeFileSync(join(this.dir, "summary.json"), `${redact(summary)}\n`);
    const verdict = !this.finishedAt
      ? "Incomplete"
      : count("failed")
        ? "Not ready"
        : count("skipped")
          ? "Incomplete"
          : "Passed";
    const cell = (value: string) => redact(value).replaceAll("|", "\\|").replaceAll("\n", " ");
    writeFileSync(
      join(this.dir, "SUMMARY.md"),
      [
        `# ${this.feature}`,
        "",
        `**${verdict}.** ${count("passed")} passed, ${count("failed")} failed, ${count("skipped")} skipped.`,
        "",
        `Commit: \`${this.run.sha}\`. Entry point: ${this.run.base}.`,
        "",
        "| Check | Result | Detail |",
        "| --- | --- | --- |",
        ...this.results.map((result) => `| ${cell(result.id)} | ${result.status} | ${cell(result.detail ?? "")} |`),
        "",
        "[Raw evidence](summary.json). This feature report does not establish completion of other verification paths or cleanup.",
        "",
      ].join("\n")
    );
  }
}

export async function responsePreview(response: Response, limit = 4000): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  try {
    const { value } = await reader.read();
    // SSE connections stay open. Capture one event and cancel instead of waiting for EOF.
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return new TextDecoder().decode(value).slice(0, limit);
    }
    let text = new TextDecoder().decode(value);
    while (text.length < limit) {
      const chunk = await reader.read();
      if (chunk.done) break;
      text += new TextDecoder().decode(chunk.value);
    }
    return text.slice(0, limit).replace(/(name="consent_token"\s+value=")[^"]+/g, "$1<redacted>");
  } finally {
    await reader.cancel();
  }
}

export function fatal(error: unknown): void {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
}
