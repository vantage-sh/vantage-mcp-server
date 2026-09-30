# Legacy SSE deprecation

ENG-3241 adds migration notices while `/sse` and `/sse/message` continue to serve existing clients. ENG-3242 owns eventual endpoint removal; ENG-2837 owns later Durable Object retirement. No shutdown date is announced by this change.

## Client migration

Change `https://mcp.vantage.sh/sse` to `https://mcp.vantage.sh/mcp` in the client's MCP server configuration. Select Streamable HTTP instead of SSE if the client requires an explicit transport. Reconnect and complete OAuth sign-in if prompted. Clients that cannot use Streamable HTTP need an update or a compatible bridge before migrating. Use the setup examples in the [README](../README.md).

Staging and local notices point to `/mcp` on their own environment's hostname. The production Worker uses the hostname configured in `SELF_CALLBACK_URL`.

## Notices and compatibility

- SSE initialization returns migration instructions and advertises MCP logging support. After `notifications/initialized`, the server attempts one `notifications/message` at warning level, respecting the client's minimum log level.
- The attempt is stored in the session's Durable Object before delivery. Repeated initialization notifications and hibernation do not repeat it. A new session gets a new warning attempt. Delivery or storage failures are logged and do not fail initialization or tool calls.
- OAuth consent includes a notice when the authorization request explicitly names a same-origin `/sse` resource. A request that omits `resource` cannot reliably identify its transport, so the consent page does not guess.
- Modern `/mcp` clients do not receive SSE instructions or warnings. Authentication, grant lifetimes, transport endpoints, and session storage remain in place.

MCP clients decide whether to display warnings or initialization instructions. Successful delivery is not evidence that a person has seen the notice. Existing authorized users may not revisit consent.

The communication plan uses protocol notices, the consent screen, and public setup instructions together. Before announcing removal, publish the migration and deadline through product documentation/release notes and communicate with identified affected customers through the team's usual channels. This implementation does not send customer communications or set a deadline.

## Verification and retirement criteria

Before releasing the notices, smoke-test these cases in staging:

1. A fresh SSE client initializes, receives the migration instructions and one warning, and can list and call tools. Check both default logging and an error-only minimum level.
2. A retained pre-upgrade SSE session can still send messages and call tools after deployment. An already initialized session is not guaranteed to receive a new warning until it reconnects and initializes; retain the other communication channels.
3. Repeated session messages and Durable Object hibernation do not produce repeated warnings.
4. OAuth consent for an explicit staging `/sse` resource shows the notice. A `/mcp` resource and an omitted resource do not. Normal OAuth and SSO consent still work.
5. Fresh and existing `/mcp` clients continue to initialize and call tools without an SSE notice. Test supported OAuth, direct-token, and agent-header paths where applicable.

Keep the compatibility route while these clients transition. For ENG-3242, require successful migration checks, the agreed communication period, and a fresh audit over the full available 14-day retention window. Track successful `GET /sse` responses and accepted `POST /sse/message` traffic separately from failed requests and probes. Zero retained successful spans is a useful gate, but sampling means it does not by itself prove that every client has migrated; corroborate with available request telemetry and affected-client follow-up. Investigate remaining successful traffic before approving removal.

The communication period and shutdown date remain release decisions. Retiring the legacy route must have an agreed rollout/rollback plan. Modern SDK v2 and stateless `/mcp` work can proceed alongside SSE, retaining SDK v1 and the Durable Object infrastructure required by the compatibility route. OAuth resource/audience changes belong to ENG-2832 and need their own compatibility validation. Keep `OAUTH_KV` after transport retirement.
