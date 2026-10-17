---
name: verify-vantage-mcp
description: Drive the Vantage MCP server the way an MCP client does and capture proof — the hosted Cloudflare Worker over Streamable HTTP (OAuth discovery, client registration, consent screen, tool calls), local stdio, and the full OAuth login on staging through MCP Inspector. Use when proving a change to auth, transport, or tool behavior works end to end, or when a PR needs verification evidence beyond unit tests.
---

# Verify the Vantage MCP server

The server has three surfaces a user touches:

| Surface | Entry point | Who uses it |
| --- | --- | --- |
| Hosted Worker, Streamable HTTP | `/mcp` (legacy `/sse`) on `wrangler dev` locally, `https://hosted-mcp-staging.vantage.sh/mcp` on staging | Claude, Cursor, ChatGPT, Inspector over OAuth; agents over delegation headers |
| Hosted Worker, OAuth endpoints | `/.well-known/*`, `/register`, `/authorize`, `/token`, `/callback` | Every OAuth MCP client before its first tool call |
| Local stdio | `npm run local` (`src/local.ts`) | Self-hosted users with a Vantage API token |

Locally the Worker runs in one of two modes, and a run picks exactly one:

- **oauth** — `VANTAGE_MCP_TOKEN` is blank, so every request goes through the OAuth provider. Development Auth0 settings are `local-dummy`, so the flow works up to the consent screen and stops at **Allow Access**.
- **token** — `VANTAGE_MCP_TOKEN` is set, so `/mcp` and `/sse` skip OAuth and call Core with that token. OAuth endpoints are not served in this mode.

The full OAuth login (Auth0, `/callback`, `/token`, refresh) only works on staging. See [features/oauth-staging-full-flow.md](features/oauth-staging-full-flow.md).

## Launch

```bash
S=.agents/skills/verify-vantage-mcp/scripts
$S/verify.sh launch oauth            # default port 8788
$S/verify.sh launch token            # default port 8789; needs a Core token
$S/verify.sh launch oauth 8790       # any free port
```

Launch prints `READY mode=<mode> url=...` and `RUN_DIR=<dir>`. Keep `RUN_DIR`; every other command takes it. Ready means usable: the script waits for Wrangler's `Ready on` line and then for `POST /mcp` to answer 401 (oauth) or 200 (token).

- Token mode reads the token from `VERIFY_VANTAGE_TOKEN`, else from a `VANTAGE_MCP_TOKEN=` line in `.dev.vars`. It must be a token your Core accepts.
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
- **Inspector CLI** (tools, resources, prompts) over HTTP:
  `npx mcp-inspector --cli http://127.0.0.1:8789/mcp --transport http --method tools/list`
  `npx mcp-inspector --cli http://127.0.0.1:8789/mcp --transport http --method tools/call --tool-name get-myself`
- **Inspector CLI over stdio:**
  `npx mcp-inspector --cli -e VANTAGE_TOKEN=<token> -e VANTAGE_API_HOST=http://localhost:3000 npx tsx src/local.ts --method tools/list`
- **Inspector UI** (`npm run inspector`, opens `http://localhost:6274`). Use it for anything that needs a human: the staging login, and eyeballing the consent screen. Its OAuth redirect URIs are `http://localhost:6274/oauth/callback` and `/oauth/callback/debug`.

## Evidence

Everything lands in `tmp/verify-vantage-mcp/<run-id>/evidence/` (`tmp/` is git-ignored):

- `worker.log` is Wrangler's output, including request lines and structured logs such as `OAuth consent shown` and `OAuth client registration`. Env-file values print as `(hidden)`.
- `oauth-consent/` holds `exchanges.jsonl` (every request and response, with cookie values stripped), one `consent-*.html` per scenario, and `summary.json` with each check and the commit tested.
- For Inspector CLI runs, redirect stdout into the run's `evidence/` directory, for example `> "$RUN_DIR/evidence/tools-list.json"`.

Proof standards:

- Drive the real client path: discovery, `/register`, `/authorize`, `tools/call`. Never call internal helpers or test-only routes.
- Capture the action and the resulting state. For a mutating tool, read the object back through a second tool call (for example `get-folder` after `create-folder`), and delete what you created.
- Mocks are acceptable only where a production boundary already isolates the external system. That means the dummy Auth0 locally; Core is real (local Core) in token mode.
- `summary.json` must show `failed: 0`. A skipped check is reported as skipped with its reason, never as passing through a different path.

## Cleanup

```bash
$S/verify.sh cleanup "$RUN_DIR"
$S/verify.sh list                      # every run, and whether it is still up
```

Cleanup stops only the process group this run started (Wrangler plus its `workerd` children), deletes `state/` (local KV, Durable Objects, and the env file holding the token), and keeps `evidence/` and `run.env`. Run it after every attempt, including failed ones. Never kill Wrangler or `workerd` by name: the user may have their own dev server up.

## Helpers

| Script | Invocation |
| --- | --- |
| `scripts/verify.sh` | `launch <oauth\|token> [port]`, `doctor <run-dir>`, `cleanup <run-dir>`, `list` |
| `scripts/oauth-consent.ts` | `npx tsx scripts/oauth-consent.ts <run-dir>`; exits 1 if any check fails |

## Keeping this current

The feature map in `features/` is the maintained source for what to verify. When a change adds or alters a user path, update the matching feature file in the same PR, or run `/maintain-verification-skill`.
