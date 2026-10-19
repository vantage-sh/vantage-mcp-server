# Local stdio server

Self-hosted users run the server on their own machine with a Vantage API token, and their MCP client talks to it over stdio. It serves the same tools and resources as the hosted Worker, against `VANTAGE_API_HOST` (default `https://api.vantage.sh`).

## Sub-features

- `stdio-start`: the server starts with `VANTAGE_TOKEN` set and exits with `VANTAGE_TOKEN environment variable is required.` without it.
- `stdio-tools-list`: `tools/list` returns the registered tools, with Access Policy tools only for account owners.
- `stdio-tool-call`: `get-myself` returns Core data as the token's user.
- `stdio-resources`: resources list and read as on the hosted Worker.

## How to get to it (user POV)

- `npm run local` from a checkout, or the published package configured as a stdio server in Claude Desktop or Cursor with `VANTAGE_TOKEN` in its env.

## Driving it with the MCP SDK and Inspector CLI

Preconditions:

- Core is running at the target host, with a token it accepts. Use a local Core for anything that mutates.

- **SDK checks.** With an owned local run manifest, run `npx tsx "$S/mcp-smoke.ts" "$RUN_DIR" --transports stdio --token-file "$VERIFY_WORK_DIR/state/local-core-token"`. It passes the explicit manifest API host and token through the child environment, checks reads and resources, and closes the child. Select `http,sse,stdio` to compare transport lists and user context. The helper creates Markdown and JSON reports under the run's `evidence/`.
- **List tools individually.** With `VANTAGE_TOKEN` already in the environment, run `npx mcp-inspector --cli -e VANTAGE_API_HOST=http://localhost:3000 npx tsx src/local.ts --method tools/list > "$RUN_DIR/evidence/stdio-tools-list.json"`. Exit 0, and the `tools` array includes `get-myself`.
- **Call a tool.** Run the same command with `--method tools/call --tool-name get-myself`. The result has `isError: false` and the user's details.
- **Missing token.** Run `npx tsx src/local.ts` with `VANTAGE_TOKEN` unset. It exits non-zero with `VANTAGE_TOKEN environment variable is required.`
- **Proof.** Keep the saved JSON outputs alongside the exact command lines, with the token redacted.

## Gotchas

- Without `VANTAGE_API_HOST`, the stdio server calls production `https://api.vantage.sh`. Always pass it explicitly when verifying.
- Inspector CLI spawns and stops the server per command, so no cleanup is needed. If you started `npm run local` yourself, stop that process.
- Do not put a real token in a saved command line. Use `<token>` in evidence.
