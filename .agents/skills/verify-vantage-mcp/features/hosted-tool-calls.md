# Hosted tool calls

An authenticated client lists the server's tools and calls them over Streamable HTTP at `/mcp`, or over the legacy SSE transport at `/sse`. Results come from Core within the credential's permissions, including service tokens without a user identity. Access Policy tools appear only when Core reports account-owner access, and SSE clients receive a one-time deprecation warning.

## Sub-features

- `tools-list`: `tools/list` returns every registered tool. `list-access-policies` and the other Access Policy tools appear only when Core reports `is_account_owner: true`.
- `tool-read`: a read-only call such as `get-myself` or `list-workspaces` returns Core data as JSON text with `isError: false`.
- `tool-error`: a Core rejection comes back as `isError: true` with Core's `errors`, not as a protocol error.
- `tool-mutation`: `create-folder` creates an object that `get-folder` then returns, and `delete-folder` removes it.
- `resources`: `resources/list` and `resources/read` return the VQL documentation.
- `sse-transport`: `/sse` serves the same tools, advertises migration instructions on initialize, and sends one `notifications/message` warning from logger `vantage.sse-deprecation`.
- `hosted-auth-routing`: with the development token override disabled, Vantage-shaped API/service bearer tokens pass through the OAuth provider's `resolveExternalToken` hook on both transports without a validation fetch. Core validates the token and permissions on each tool call. Invalid or revoked Vantage tokens can initialize MCP, but calls return Core errors with `isError: true`. Bearer requests forward only their bearer token to Core. A nonempty `X-Vantage-Agent-Delegation` header bypasses OAuth only on `/mcp`, `/sse`, and their subpaths, and only when the Worker sees no `Authorization` header. Only the delegation header is forwarded for that path.
- `oauth-route-precedence`: discovery, registration, and authorization remain with OAuth even when delegation or other `X-Vantage-*` headers are present. An invalid nonempty `Authorization` header never falls back to delegation.
- `staging-agent-delegation`: the staging Vantage agent calls `get-myself` and `list-workspaces` through the deployed hosted MCP refactor as the signed-in user's account.

## How to get to it (user POV)

- Any MCP client pointed at `http://127.0.0.1:<port>/mcp` on a token-mode run (no login needed).
- Legacy SSE clients pointed at `http://127.0.0.1:<port>/sse`.
- Clients configured with `Authorization: Bearer <Vantage API token>` against either hosted transport, including personal and service tokens.

## Driving it with the MCP SDK and Inspector

Preconditions:

- Core is running at `VERIFY_API_HOST` (default `http://localhost:3000`), with a token it accepts.
- A token-mode run: `VERIFY_VANTAGE_TOKEN=<token> scripts/verify.sh launch token`, and doctor all `PASS`.

Start with the reusable SDK helper: `npx tsx "$S/mcp-smoke.ts" "$RUN_DIR" --transports http,sse`. It records actual tool calls, owner gating, resource reads, matching tool lists, and the SSE warning in a fresh feature report. It is read-only. With an owned token-mode Worker and loopback Core, add `--mutate` for create/read/delete plus a not-found read after deletion. A failed cleanup retains the folder token in evidence; finish that cleanup before handing off. Individual Inspector commands below remain useful when diagnosing a specific tool.

- **List tools.** Run `npx mcp-inspector --cli http://127.0.0.1:8789/mcp --transport http --method tools/list > "$RUN_DIR/evidence/tools-list.json"`. Exit 0. The JSON `tools` array includes `get-myself`. It includes `list-access-policies` only if the token's user is an account owner.
- **Read call.** Run `npx mcp-inspector --cli http://127.0.0.1:8789/mcp --transport http --method tools/call --tool-name get-myself > "$RUN_DIR/evidence/get-myself.json"`. The result has `isError: false`, and the text contains the user's email and workspaces.
- **Error path.** Relaunch with a token Core rejects and call `get-myself` again. The result has `isError: true` and text `{"errors": ["Invalid Token"]}`.
- **Mutation with read-back.** Run `... --method tools/call --tool-name create-folder --tool-arg title="verify-<run-id>" type=CostFolder` and note the returned token. Then run `... --tool-name get-folder --tool-arg folder_token=<token>`; the title matches. Finally run `... --tool-name delete-folder --tool-arg folder_token=<token>`, which returns `{"token": "<token>"}`. Save all three outputs.
- **Resources.** Run `... --method resources/list`, then `... --method resources/read --uri <first uri>`. The content has `mimeType` `text/markdown`.
- **SSE transport.** Run `npx mcp-inspector --cli http://127.0.0.1:8789/sse --transport sse --method tools/list`. It returns the same tool names as `/mcp`.
- **Proof.** Keep the saved JSON files, plus `worker.log` lines showing `Vantage API request` for each Core call.

For authentication routing, start a separate **oauth-mode** run and pass doctor before driving it; token mode bypasses this router. Run `npx tsx "$S/auth-routing.ts" "$RUN_DIR"`. It checks both transports with missing, unknown, legacy, blank delegation, deliberately invalid bearer, and mixed credentials, plus OAuth endpoints and path boundaries. Malformed or unknown Authorization values are rejected; Vantage-shaped bearer tokens can initialize and must be checked with a tool call. Only an absent Authorization header permits delegation. Runtime stripping of an empty wire header is an unmet end-to-end requirement, not a passing normalization policy. Preserve the failure and inspect the header at the earliest Worker entry point before proposing a router change.

For successful direct bearer access, run `npx tsx "$S/mcp-smoke.ts" "$RUN_DIR" --auth bearer --transports http,sse --token-file "$VERIFY_WORK_DIR/state/local-core-token"` against the **oauth-mode** Worker. Test a personal token and a service token separately with `read` scope. Record the token type and intended workspace/account context without recording its value. Assert successful `get-myself` and `list-workspaces`, owner gating, resources, and matching account context across transports. A service token's `default_workspace_token` can be absent; use its returned workspaces and owner flag for context. Invalid/revoked Vantage tokens must fail on authenticated tool calls, including when delegation is also supplied. Use `--auth bearer --expect core-error` with a private file containing a deliberately invalid Vantage-shaped token; assert Core errors and hidden owner tools. A token-mode run or an OAuth-issued token does not prove direct bearer support.

Use an MCP client configured with only `X-Vantage-Agent-Delegation` to initialize, list tools, and call `get-myself` and `list-workspaces` on both transports. A valid delegation token must resolve the intended Core user. A deliberately invalid delegation token can verify the Core error path, but cannot prove successful delegation authentication or header allowlisting. The allowlist also needs the router tests or receiver-side evidence. Record the client request, result, commit, and credential source without recording the credential. Full OAuth-issued-token calls remain a staging check.

The smoke helper supports `--auth invalid-delegation --expect core-error` without a credential, or `--auth delegation --delegation-token-file <private-file>` for a real delegation token. For OAuth, use `--auth oauth --oauth-token-file <private-json> --transports http` (or `sse`) with a resource-scoped grant. Credential files belong under the working verification folder's `state/`, with permissions 600. Tokens may also come from the documented environment variables; see `--help`.

For real staging delegation without manually minting a token, follow the approved deploy and restore steps in [OAuth full login](oauth-staging-full-flow.md), then open `https://console-staging.vantage.sh/agent` as the user. Start a new conversation asking for a read-only authentication check using `get-myself` and `list-workspaces`. Expand both completed tool cards and save their actual results, not just the agent's summary. Correlate the test window with Datadog `env:staging service:scout-agents` tool spans and HTTP client spans whose `server.address` is `hosted-mcp-staging.vantage.sh`. Confirm the test commit is still deployed. Compare the returned workspace/account context with the signed-in staging user. This verifies the agent's configured `/mcp` path; it does not prove delegation through `/sse` or receiver-side header values. Successful delegation over deprecated `/sse` is optional when the only delegation client is the Vantage agent using `/mcp`; record that scope decision rather than treating it as a required missing check.

## Gotchas

- Only point mutations at a local Core you can reset. Token mode calls whichever Core `VERIFY_API_HOST` names.
- Folder deletion requires local Core's Temporal server and worker. If reads and creation work but delete returns 500, check Core's log for `GRPC::Unavailable` at `127.0.0.1:7233`. Bring up the local dependency before retrying; capture the original error, confirm `get-folder` reports not found, and let `ObjectDestroyWorkflow` complete before stopping any temporary worker. Stop only services started for this run.
- The owner check runs on every Durable Object session start. A failed `/v2/me` hides the Access Policy tools rather than erroring, so their absence alone does not prove Core rejected the token.
- The Inspector CLI does not print server notifications. Use the SDK smoke helper, or Inspector UI over **SSE**, to observe the deprecation warning.
- An empty Authorization header sent over local HTTP can be removed before the router receives the request. On the local Worker tested at `7c252e3`, curl sent `Authorization:` but a debugger observation at the router showed `headers.has("Authorization") === false`. Report this separately from nonempty invalid-header rejection; the in-memory empty-header unit test does not prove that the wire header survives the runtime.
- Tool counts change whenever tools are added. Assert on specific names, not on a count.
