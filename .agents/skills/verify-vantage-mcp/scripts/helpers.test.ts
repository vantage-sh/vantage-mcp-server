import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { assertMutationTarget, type CallTool, folderRoundTrip } from "./mcp-client";
import { credential, privateJson, Report, type Run, redact, responsePreview, savePrivate } from "./support";

const json = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  isError,
});

function fixture() {
  if (!process.env.VERIFY_WORK_DIR) throw new Error("Set VERIFY_WORK_DIR to the working verification folder");
  const parent = join(process.env.VERIFY_WORK_DIR, "state");
  mkdirSync(parent, { recursive: true });
  const dir = mkdtempSync(join(parent, "helper-test-"));
  const run: Run = {
    dir,
    base: "http://127.0.0.1:8789",
    apiHost: "http://localhost:3000",
    sha: "test",
    mode: "token",
    local: true,
  };
  return { run, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("reports preserve attempts and redact both original and rotated credentials", () => {
  const { run, cleanup } = fixture();
  try {
    const path = join(run.dir, "state/token.json");
    savePrivate(path, { tokens: { access_token: "original-private-token", refresh_token: "rotated-private-token" } });
    privateJson(path);
    const first = new Report(run, "test");
    first.evidence.response = "original-private-token rotated-private-token";
    first.check("negative", false, "Bearer other-private-token");
    assert.equal(first.finish(), 1);
    const second = new Report(run, "test");
    assert.notEqual(first.dir, second.dir);
    const output = readFileSync(join(first.dir, "summary.json"), "utf8");
    assert.doesNotMatch(output, /original-private-token|rotated-private-token|other-private-token/);
    assert.match(readFileSync(join(first.dir, "SUMMARY.md"), "utf8"), /Not ready/);
    assert.equal(JSON.parse(output).failed, 1);
    chmodSync(path, 0o644);
    assert.throws(() => privateJson(path), /600/);
    assert.match(redact('Bearer realm="OAuth", error="invalid_token"'), /realm="OAuth"/);
    assert.match(redact('Bearer resource_metadata="https://example.test/metadata"'), /resource_metadata=/);
    assert.match(
      redact({ challenge: 'Bearer resource_metadata="https://example.test/metadata"' }),
      /resource_metadata=/
    );
    assert.throws(() => savePrivate(path, {}), /EEXIST/);
  } finally {
    cleanup();
  }
});

test("plaintext credentials are trimmed, validated and redacted", () => {
  const { run, cleanup } = fixture();
  try {
    const path = join(run.dir, "token");
    writeFileSync(path, "  plaintext-test-credential\n", { mode: 0o600 });
    assert.equal(credential("VERIFY_MISSING_TEST_TOKEN", path), "plaintext-test-credential");
    assert.equal(redact("plaintext-test-credential"), "<redacted>");
    writeFileSync(path, "two words");
    assert.throws(() => credential("VERIFY_MISSING_TEST_TOKEN", path), /plaintext/);
    assert.throws(() => credential("VERIFY_MISSING_TEST_TOKEN"), /plaintext/);
  } finally {
    cleanup();
  }
});

test("SSE evidence captures the first event and cancels without waiting for EOF", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("event: endpoint\ndata: /sse/message\n\n"));
    },
    cancel() {
      cancelled = true;
    },
  });
  assert.match(
    await responsePreview(new Response(body, { headers: { "content-type": "text/event-stream" } })),
    /endpoint/
  );
  assert.equal(cancelled, true);
});

test("mutations reject remote, production, and OAuth targets", () => {
  const { run, cleanup } = fixture();
  try {
    assert.doesNotThrow(() => assertMutationTarget(run));
    for (const target of [
      { ...run, local: false },
      { ...run, mode: "oauth" },
      { ...run, apiHost: "https://api.vantage.sh" },
      { ...run, apiHost: undefined },
    ]) {
      assert.throws(() => assertMutationTarget(target), /owned local/);
    }
  } finally {
    cleanup();
  }
});

test("a failed read still deletes the created object and preserves its cleanup token", async () => {
  const { run, cleanup } = fixture();
  try {
    const report = new Report(run, "mutation");
    const calls: string[] = [];
    const call: CallTool = async (name) => {
      calls.push(name);
      if (name === "create-folder") return json({ token: "test-folder" });
      if (name === "delete-folder") return json({ token: "test-folder" });
      if (calls.length === 2) throw new Error("read failed");
      return json({ errors: [{ message: "Folder not found" }] }, true);
    };
    await assert.rejects(folderRoundTrip(call, report, "test-workspace"), /read failed/);
    assert.deepEqual(calls, ["create-folder", "get-folder", "delete-folder", "get-folder"]);
    assert.deepEqual((report.evidence.mutation as { token: string; cleanupPending: boolean }).cleanupPending, false);
    assert.equal((report.evidence.mutation as { token: string }).token, "test-folder");
  } finally {
    cleanup();
  }
});

test("an unrelated read error cannot establish deletion", async () => {
  const { run, cleanup } = fixture();
  try {
    const report = new Report(run, "mutation");
    let title: unknown;
    let reads = 0;
    const call: CallTool = async (name, args) => {
      if (name === "create-folder") {
        title = args.title;
        return json({ token: "test-folder" });
      }
      if (name === "delete-folder") return json({ token: "test-folder" });
      return ++reads === 1 ? json({ title }) : json({ errors: ["Invalid Token"] }, true);
    };
    await folderRoundTrip(call, report, "test-workspace");
    assert.equal(report.results.find((result) => result.id === "folder-absent-after-delete")?.status, "failed");
    assert.equal((report.evidence.mutation as { cleanupPending: boolean }).cleanupPending, true);
    assert.equal(report.finish(), 1);
  } finally {
    cleanup();
  }
});

test("failed cleanup leaves the token in the persisted report", async () => {
  const { run, cleanup } = fixture();
  try {
    mkdirSync(join(run.dir, "state"));
    const report = new Report(run, "mutation");
    const call: CallTool = async (name) => {
      if (name === "create-folder") return json({ token: "cleanup-needed" });
      throw new Error("Core unavailable");
    };
    await assert.rejects(folderRoundTrip(call, report, "workspace"), /Core unavailable/);
    const saved = JSON.parse(readFileSync(join(report.dir, "summary.json"), "utf8"));
    assert.equal(saved.evidence.mutation.token, "cleanup-needed");
    assert.equal(saved.evidence.mutation.cleanupPending, true);
  } finally {
    cleanup();
  }
});
