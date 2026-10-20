# Vantage MCP verification map

This directory is the maintained source for verifying the user-facing behavior of the Vantage MCP server. Read this index before driving anything, then follow the matching feature file as the recipe.

## Baseline preconditions

- Dependencies installed (`npm ci`), and the checkout is the commit under test.
- Choose and export `VERIFY_WORK_DIR` inside `tmp/verify-vantage-mcp/`. All work, one-off scripts, and outputs stay beneath it; see the [folder layout](../SKILL.md#evidence).
- Local runs are started by `scripts/verify.sh launch <oauth|token>` and pass `scripts/verify.sh doctor "$RUN_DIR"` before driving.
- Token-mode and stdio runs need a running Vantage Core (default `http://localhost:3000`, override with `VERIFY_API_HOST`) and a token it accepts in `VERIFY_VANTAGE_TOKEN` or `.dev.vars`.
- Staging runs need explicit user approval for each deploy, a pushed branch, and `gh` authenticated for `vantage-sh/vantage-mcp-server`.
- Never drive an instance this run did not start.

## Driving conventions

- Start each recipe from a fresh launch. Local KV is per run, so registered clients and grants never carry over.
- Use `127.0.0.1` URLs for local runs. `localhost` can resolve to IPv6 first on macOS, and the Worker binds IPv4.
- Treat commands as literal. Keep tool names, flags, and quoted strings unchanged.
- Delete any object a mutating tool created, and read it back first as proof.

## Proof and skip reporting

Deliver a readable `SUMMARY.md` in the working verification folder, with any combined JSON report beside it, following the [summary requirements](../SKILL.md#evidence). The Markdown report is the user-facing result.

For a public PR, summarize relevant verification as short Markdown checklist items (`- [x]` for passing checks, `- [ ]` for incomplete or failed checks) using [the PR guidance](../SKILL.md#writing-verification-in-a-pr). Keep local evidence references and the full run history in the local report and handoff.

- HTTP proof is the request, status, relevant headers, and body for each step. The OAuth walk records these in `exchanges.jsonl`.
- MCP proof is the SDK helper's captured calls and results, or the Inspector CLI command and JSON output, saved under the run's `evidence/`.
- UI proof (staging) is a screenshot or the Inspector **History** panel showing the action and the result, plus the matching staging spans in Datadog (read-only).
- Record the feature ID, entry point, and commit with every artifact. `summary.json` does this for the OAuth walk.
- Report an unreachable path with the attempted command and the unmet precondition. Do not report a skipped entry point as verified through a different one.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, `Gotchas`.

## Features

- [OAuth discovery, registration, and consent (local)](./oauth-local-consent.md): challenge, metadata, dynamic client registration, and every consent-screen notice. Needs no Core and no Auth0.
- [OAuth full login (staging)](./oauth-staging-full-flow.md): Inspector completes Auth0 login, calls a tool, and reconnects with the issued token.
- [Hosted tool calls](./hosted-tool-calls.md): listing and calling tools over `/mcp` and legacy `/sse`, owner-only gating, and the SSE deprecation notice.
- [Local stdio server](./local-stdio.md): `npm run local` with a Vantage API token.
