---
name: verify-vantage-mcp
description: Verify Vantage MCP auth, transport, and tool behavior end to end across the hosted Worker, local stdio, and staging OAuth login, and capture client-visible evidence.
disable-model-invocation: true
---

# Verify the Vantage MCP server

The server has three surfaces a user touches:

| Surface                        | Entry point                                                                                              | Who uses it                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Hosted Worker, Streamable HTTP | `/mcp` (legacy `/sse`) on `wrangler dev` locally, `https://hosted-mcp-staging.vantage.sh/mcp` on staging | OAuth clients; API/service-token clients over bearer auth; agents over delegation headers |
| Hosted Worker, OAuth endpoints | `/.well-known/*`, `/register`, `/authorize`, `/token`, `/callback`                                       | Every OAuth MCP client before its first tool call                             |
| Local stdio                    | `npm run local` (`src/local.ts`)                                                                         | Self-hosted users with a Vantage API token                                    |

Locally the Worker runs in one of two modes, and a run picks exactly one:

- **oauth** — `VANTAGE_MCP_TOKEN` is blank, so bearer requests use the OAuth provider, including direct API/service-token passthrough through `resolveExternalToken`; Core validates these credentials on tool calls. Delegation-only MCP requests use the pre-router described in [hosted tool calls](features/hosted-tool-calls.md). Development Auth0 settings are `local-dummy`, so browser login works up to the consent screen and stops at **Allow Access**.
- **token** — `VANTAGE_MCP_TOKEN` is set, so `/mcp` and `/sse` skip OAuth and call Core with that token. OAuth endpoints are not served in this mode.

The full OAuth login (Auth0, `/callback`, `/token`, refresh) only works on staging. See [features/oauth-staging-full-flow.md](features/oauth-staging-full-flow.md).

## Launch

Choose one working verification folder before starting. **All work for this verification belongs inside it:** local runs (including failed attempts), one-off scripts, logs, screenshots, credential scratch files, and reports. Never leave loose artifacts directly in `tmp/verify-vantage-mcp/` or scatter this verification across sibling folders. For example, PR 298 used `staging-pr-298`.

```bash
S=.agents/skills/verify-vantage-mcp/scripts
export VERIFY_WORK_DIR="$PWD/tmp/verify-vantage-mcp/staging-pr-298" # choose a name for this verification
mkdir -p "$VERIFY_WORK_DIR/scripts" "$VERIFY_WORK_DIR/evidence"
$S/verify.sh launch oauth            # default port 8788
$S/verify.sh launch token            # default port 8789; needs a Core token
$S/verify.sh launch oauth 8790       # any free port
```

Launch requires `VERIFY_WORK_DIR` inside the ignored `tmp/verify-vantage-mcp/` directory and creates a fresh `runs/<timestamp>-<mode>-<port>/` beneath it. It prints `READY mode=<mode> url=...` and `RUN_DIR=<dir>`. Keep `RUN_DIR`; every other local command takes it. Ready means usable: the script waits for Wrangler's `Ready on` line and then for `POST /mcp` to answer 401 (oauth) or 200 (token).

- Token mode reads `VERIFY_VANTAGE_TOKEN`, then `VERIFY_VANTAGE_TOKEN_FILE` (a plaintext token file), then an active `VANTAGE_MCP_TOKEN=` line in `.dev.vars`. Confirm the token targets the selected Core; `.dev.vars` may contain a production token. Prefer an explicit environment variable or private file for local verification. Never put credential values in command arguments or evidence.
- Core defaults to `http://localhost:3000`. Override with `VERIFY_API_HOST=<url>`.
- To flip a Worker flag for one run, set `VERIFY_WORKER_VARS="NAME:value NAME2:value"`. Each pair becomes a `--var`, and `run.env` records them as `WORKER_VARS`.
- Each run gets its own port, devtools port (port + 1000), Durable Object/KV store, and env file, so oauth and token runs can be up at the same time. Launch refuses a port that is already in use. Never drive a Worker this run did not start, including the user's own `npm run dev` on 8787.
- The script passes `--env-file`, which makes Wrangler skip `.dev.vars`. A token in `.dev.vars` therefore cannot leak into an oauth-mode run, and `.dev.vars` extras such as `DATADOG_API_KEY` are not loaded.
- Launching from a fresh checkout needs only `npm ci`. Local KV and Durable Objects start empty.

## Doctor

```bash
$S/verify.sh doctor "$RUN_DIR"
```

Run it first, and again whenever anything looks off. It checks, read-only, that the process group is alive, that it owns the port, that the checkout still matches the launched commit, and that the mode behaves as expected: oauth answers 401 and serves authorization-server metadata, token answers `initialize` with 200. Any `FAIL` means relaunch rather than drive.

## Drive

Use the matching recipe in [features/README.md](features/README.md). The harnesses are:

- **OAuth client walk:** `npx tsx $S/oauth-consent.ts "$RUN_DIR"`. It performs the same HTTP steps an MCP client takes before login, and asserts on the challenge, discovery, registration, and consent screen.
- **Auth routing:** `npx tsx $S/auth-routing.ts "$RUN_DIR"` checks challenge and credential precedence on both transports, OAuth route precedence, and MCP path boundaries. It uses deliberately invalid credentials; initialization alone does not prove authenticated Core calls.
- **MCP SDK smoke checks:** `npx tsx $S/mcp-smoke.ts "$RUN_DIR" --transports http,sse,stdio --token-file "$VERIFY_WORK_DIR/state/local-core-token"` checks real Core reads, owner gating, resource reads, transport parity, and SSE notifications. Hosted calls use the token-mode Worker; stdio gets the explicit Core token and manifest's API host. Omit stdio and the token-file flag when checking only hosted token mode. Read-only by default; `--mutate` opts into folder create/read/delete against an owned local token-mode Worker with loopback Core. See `--help` for delegation and OAuth credentials.
- **Hosted API/service-token checks:** use an **oauth-mode** run and `npx tsx $S/mcp-smoke.ts "$RUN_DIR" --auth bearer --transports http,sse --token-file "$VERIFY_WORK_DIR/state/local-core-token"`. This exercises the actual direct-bearer resolver; token mode bypasses it. Test personal and service tokens separately and record their types. Service tokens need not have a user's default workspace.
- **OAuth refresh:** `npx tsx $S/oauth-refresh.ts "$RUN_DIR" --credentials-file "$RUN_DIR/state/oauth.json" --resource-path /mcp` makes one SDK refresh grant and calls the matching transport. Input is private JSON with `client`, `tokens`, and optional `resource`; see `--help`. It saves rotated credentials before later checks, never retries `invalid_grant`, and requires a separate resource-scoped grant for `/sse`. Obtain credentials through the approved real OAuth login.
- **Inspector UI** (`npm run inspector`, opens `http://localhost:6274`). Use it for anything that needs a human: the staging login, and eyeballing the consent screen. Its OAuth redirect URIs are `http://localhost:6274/oauth/callback` and `/oauth/callback/debug`.

## Evidence

Keep the working folder self-contained (`tmp/` is git-ignored):

```text
<working-folder>/
  SUMMARY.md                   primary readable handoff
  verification-summary.json    optional aggregate data
  scripts/                     one-off scripts for this verification (prefer .ts)
  evidence/                    shared logs, screenshots, and investigation outputs
  state/                       private temporary credentials; remove during cleanup
  runs/<run-id>/                each local launch and all of its artifacts
```

For staging-only helpers, put `run.env` in the working folder (or a staging subfolder beneath `runs/`) with `MODE=staging`, `BASE_URL=https://hosted-mcp-staging.vantage.sh`, and `GIT_SHA=<confirmed-deployed-sha>`. Do not invent a local `PGID` for staging. Confirm the approved deployment before driving; helpers do not deploy or prove which commit is live.

Raw local evidence belongs in each run's `evidence/` directory:

- `worker.log` is Wrangler's output, including request lines and structured logs such as `OAuth consent shown` and `OAuth client registration`. Env-file values print as `(hidden)`.
- `oauth-consent-*/` holds `exchanges.jsonl` (every request and response, with cookie values stripped), one `consent-*.html` per scenario, and `summary.json` with each check and the commit tested.
- The routing, MCP smoke, and refresh helpers each create a fresh `evidence/<feature>-*/` with `SUMMARY.md` and `summary.json`, including failures. Repeating a check never overwrites an earlier attempt.
- For Inspector CLI runs, redirect stdout into the run's `evidence/` directory, for example `> "$RUN_DIR/evidence/tools-list.json"`.

Proof standards:

- Drive the real client path: discovery, `/register`, `/authorize`, `tools/call`. Never call internal helpers or test-only routes.
- Capture the action and the resulting state. For a mutating tool, read the object back through a second tool call (for example `get-folder` after `create-folder`), and delete what you created.
- Mocks are acceptable only where a production boundary already isolates the external system. That means the dummy Auth0 locally; Core is real (local Core) in token mode.
- Report a suite as passing only when its `summary.json` shows `failed: 0`. Preserve failed attempts and explain any corrections or successful retries. A skipped check is reported as skipped with its reason, never as passing through a different path.

When verification exposes a product failure or an API/tool mismatch, follow [AGENTS.md: Surfacing verification findings in chat](../../../AGENTS.md#surfacing-verification-findings-in-chat). Clearly call out the unresolved behavior, its user impact, and the remaining work in the agent chat and final handoff. For example, if the API rejects a free-text widget with grid-only settings that the MCP tool accepts, omitting the grid on retry verifies only the reduced request; it does not establish working grid support. Keep this finding visible even if it is outside the current PR's scope.

Before handing results back, write **`SUMMARY.md` in the working verification folder** as the primary report. Keep an aggregate `verification-summary.json`, when produced, beside it. Per-feature reports remain with their raw evidence and do not replace this combined handoff. Link every local or staging subrun from the working folder's report.

The Markdown summary must be understandable without opening JSON:

- Lead with a plain-language verdict: **Ready**, **Ready with caveats**, **Not ready**, or **Incomplete**, and explain whether anything still needs attention before merging. Do not give an unconditional Ready verdict while required checks have failures or are unverified.
- Identify the PR or change, tested commits, date, environments, and entry points. Distinguish local and deployed commits when they differ.
- Show what passed and failed in a compact table. Explain initial failures, retries, client workarounds, unresolved behavior, and their effect on the verdict; retain original evidence and counts.
- List skipped or unverified paths with their reasons and any remaining action. Record cleanup, test-object deletion, and staging restoration, including anything still pending.
- Link to supporting logs, screenshots, JSON, and other run folders using paths relative to the report. Never include credential values.

Finalize the summary after cleanup so it reflects the actual final state. Link to `SUMMARY.md` in the final response and open it in Codex when that file-opening tool is available; JSON is supporting evidence, not the user-facing handoff.

## Writing verification in a PR

Follow [AGENTS.md: Writing verification in a PR](../../../AGENTS.md#writing-verification-in-a-pr). The detailed local report is the evidence record; write the public PR verification as short behavior-focused bullets, not a copied report, results table, or dense paragraph. Each behavior bullet should identify the action taken and the observed result, for example:

- Validated creating a Dashboard by creating it inside a Folder without specifying a Workspace, then reading it back to confirm the Folder and inherited Workspace.
- Validated moving a Dashboard by moving it between Folders and to root, then reading it back to confirm its location and preserved widgets.
- Validated Folder filtering by checking that the list includes direct children and excludes Dashboards in subfolders.

Add concise bullets for automated checks and relevant unverified behavior. Counts can supplement the behavior descriptions. Keep local paths, checkout details, source hashes, resolved harness retries, unrelated findings, and routine cleanup bookkeeping in the local report. Carry a failure or workaround into the PR only when it affects verification of the submitted change.

## Cleanup

```bash
$S/verify.sh cleanup "$RUN_DIR"
$S/verify.sh list                      # every run, and whether it is still up
```

Cleanup stops only the process group this run started (Wrangler plus its `workerd` children), deletes `state/` (local KV, Durable Objects, and the env file holding the token), and keeps `evidence/` and `run.env`. Run it after every attempt, including failed ones. Never kill Wrangler or `workerd` by name: the user may have their own dev server up.

Repeat cleanup for every local subrun. Staging has no local process group; restore it as required by the staging recipe, stop only locally started Inspector or dependency processes, and remove temporary credentials from the working folder and any staging subfolder's `state/`. Preserve scripts and evidence. `list` recursively shows nested runs and labels staging manifests `external`.

## Helpers

| Script                     | Invocation                                                                      |
| -------------------------- | ------------------------------------------------------------------------------- |
| `scripts/verify.sh`        | `launch <oauth\|token> [port]`, `doctor <run-dir>`, `cleanup <run-dir>`, `list` |
| `scripts/oauth-consent.ts` | `npx tsx scripts/oauth-consent.ts <run-dir>`; exits 1 if any check fails        |
| `scripts/auth-routing.ts` | `npx tsx scripts/auth-routing.ts <run-dir>`; malformed/unknown Authorization is rejected; Vantage-shaped tokens reach Core on tool calls |
| `scripts/mcp-smoke.ts` | `npx tsx scripts/mcp-smoke.ts <run-dir> [options]`; see `--help` |
| `scripts/oauth-refresh.ts` | `npx tsx scripts/oauth-refresh.ts <run-dir> --credentials-file <private-json> [--resource-path /mcp\|/sse]` |

`support.ts` and `mcp-client.ts` share credential redaction, manifest checks, reports, transport setup, and mutation cleanup. Promote reusable behavior here as parameterized TypeScript, without run-specific tokens, workspace IDs, commits, or paths. Keep debugger probes and other one-off investigations under the working folder's `scripts/`.

## Keeping this current

The feature map in `features/` is the maintained source for what to verify. When a change adds or alters a user path, update the matching feature file in the same PR, or run `/maintain-verification-skill`.

Repository TypeScript and Biome defaults exclude `.agents/`. When changing these helpers, run:

```bash
npx tsc -p "$S/tsconfig.json"
for file in "$S"/*.ts; do
  checked="$VERIFY_WORK_DIR/evidence/biome-$(basename "$file").out"
  npx biome check --write --stdin-file-path="$(basename "$file")" < "$file" > "$checked" && cmp "$file" "$checked"
done
npx tsx --test "$S/helpers.test.ts" # uses exported VERIFY_WORK_DIR for test scratch files
bash -n "$S/verify.sh"
```

The helper tests exercise reporting and cleanup with stubs; they are not end-to-end Core or OAuth proof. Record which real entry points were exercised and which still need credentials or staging approval.
