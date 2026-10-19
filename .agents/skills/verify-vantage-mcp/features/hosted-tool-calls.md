# Hosted tool calls

An authenticated client lists the server's tools and calls them over Streamable HTTP at `/mcp`, or over the legacy SSE transport at `/sse`. Results come from Core as the token's user. Access Policy tools appear only for account owners, and SSE clients receive a one-time deprecation warning.

## Sub-features

- `tools-list`: `tools/list` returns every registered tool. `list-access-policies` and the other Access Policy tools appear only when Core reports `is_account_owner: true`.
- `tool-read`: a read-only call such as `get-myself` or `list-workspaces` returns Core data as JSON text with `isError: false`.
- `tool-error`: a Core rejection comes back as `isError: true` with Core's `errors`, not as a protocol error.
- `tool-mutation`: `create-folder` creates an object that `get-folder` then returns, and `delete-folder` removes it.
- `resources`: `resources/list` and `resources/read` return the VQL documentation.
- `sse-transport`: `/sse` serves the same tools, advertises migration instructions on initialize, and sends one `notifications/message` warning from logger `vantage.sse-deprecation`.

## How to get to it (user POV)

- Any MCP client pointed at `http://127.0.0.1:<port>/mcp` on a token-mode run (no login needed).
- Legacy SSE clients pointed at `http://127.0.0.1:<port>/sse`.

## Driving it with Inspector CLI

Preconditions:

- Core is running at `VERIFY_API_HOST` (default `http://localhost:3000`), with a token it accepts.
- A token-mode run: `VERIFY_VANTAGE_TOKEN=<token> scripts/verify.sh launch token`, and doctor all `PASS`.

- **List tools.** Run `npx mcp-inspector --cli http://127.0.0.1:8789/mcp --transport http --method tools/list > "$RUN_DIR/evidence/tools-list.json"`. Exit 0. The JSON `tools` array includes `get-myself`. It includes `list-access-policies` only if the token's user is an account owner.
- **Read call.** Run `npx mcp-inspector --cli http://127.0.0.1:8789/mcp --transport http --method tools/call --tool-name get-myself > "$RUN_DIR/evidence/get-myself.json"`. The result has `isError: false`, and the text contains the user's email and workspaces.
- **Error path.** Relaunch with a token Core rejects and call `get-myself` again. The result has `isError: true` and text `{"errors": ["Invalid Token"]}`.
- **Mutation with read-back.** Run `... --method tools/call --tool-name create-folder --tool-arg title="verify-<run-id>" type=CostFolder` and note the returned token. Then run `... --tool-name get-folder --tool-arg folder_token=<token>`; the title matches. Finally run `... --tool-name delete-folder --tool-arg folder_token=<token>`, which returns `{"token": "<token>"}`. Save all three outputs.
- **Resources.** Run `... --method resources/list`, then `... --method resources/read --uri <first uri>`. The content has `mimeType` `text/markdown`.
- **SSE transport.** Run `npx mcp-inspector --cli http://127.0.0.1:8789/sse --transport sse --method tools/list`. It returns the same tool names as `/mcp`.
- **Proof.** Keep the saved JSON files, plus `worker.log` lines showing `Vantage API request` for each Core call.

## Gotchas

- Only point mutations at a local Core you can reset. Token mode calls whichever Core `VERIFY_API_HOST` names.
- The owner check runs on every Durable Object session start. A failed `/v2/me` hides the Access Policy tools rather than erroring, so their absence alone does not prove Core rejected the token.
- The Inspector CLI does not print server notifications, so it cannot observe the SSE deprecation warning. Use the Inspector UI over **SSE** and watch the notifications pane, or the unit tests in `test/sse-deprecation.test.ts`.
- Tool counts change whenever tools are added. Assert on specific names, not on a count.
