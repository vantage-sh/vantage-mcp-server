# OAuth discovery, registration, and consent (local)

Before an MCP client can call a tool, it gets a 401 challenge, discovers the protected-resource and authorization-server metadata, registers itself, and sends the user to a consent screen. That screen names the client and warns when the client is a local app, unverified, or connecting through the deprecated `/sse` endpoint.

## Sub-features

- `oauth-challenge`: an unauthenticated `POST /mcp` returns 401 with a `Bearer` `WWW-Authenticate` header that points to `resource_metadata`.
- `oauth-discovery`: `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server` advertise the authorize, token, and registration endpoints, with PKCE `S256`.
- `oauth-dcr`: `POST /register` returns 201 with a `client_id` for valid metadata, and 400 `invalid_client_metadata` for invalid redirect URIs (fragments, credentials, plain http off loopback).
- `consent-local-app`: a loopback redirect (Inspector, Claude Code) shows the **Local application** note naming the host.
- `consent-unverified`: a non-loopback redirect from an unrecognised client shows **Unverified application** and the redirect host. A well-known name (for example `Claude`) on a foreign host adds "uses the name of a well-known client".
- `consent-sse-notice`: `resource=<origin>/sse` shows **Update your Vantage MCP connection** with the `/mcp` URL, and `resource=<origin>/mcp` does not.
- `consent-csrf`: the consent form carries `transaction_state` and `consent_token`, and the response sets an `auth0_req_<state>` cookie.
- `authorize-unknown-client`: an unregistered `client_id` gets a 4xx and no consent form.

## How to get to it (user POV)

- Add `http://127.0.0.1:<port>/mcp` as a remote server in any OAuth-capable MCP client (Inspector, Claude Code, Cursor). The client runs discovery and registration and opens the consent screen in a browser.
- In the Inspector UI, choose **Open Auth Settings** and then **Guided OAuth Flow** to step through the same stages one at a time.

## Driving it with oauth-consent.ts

Preconditions:

- An oauth-mode run: `scripts/verify.sh launch oauth`, and `scripts/verify.sh doctor "$RUN_DIR"` all `PASS`.

- **Walk the client flow.** Run `npx tsx .agents/skills/verify-vantage-mcp/scripts/oauth-consent.ts "$RUN_DIR"`. Each check prints `PASS` or `FAIL`, ending with `N/N checks passed`. The exit code is 0 only when all pass.
- **Challenge and discovery.** Checks `challenge-401`, `challenge-www-authenticate`, `protected-resource-metadata`, `authorization-server-metadata`, `pkce-s256-advertised`. `exchanges.jsonl` shows the `resource_metadata` URL taken from the challenge and fetched next.
- **Registration.** Checks `register-local-client` (`MCP Inspector (verify)` with `http://localhost:6274/oauth/callback`), `register-unverified-client` (`Claude` with `https://verify.example/callback`), and `register-rejects-invalid-redirect`. `worker.log` shows matching `OAuth client registration` lines with `oauth_registration_outcome` `accepted` and `rejected`.
- **Consent screen.** `consent-mcp-resource.html`, `consent-sse-resource.html`, and `consent-unverified-client.html` are the rendered pages. Checks `consent-renders`, `consent-names-client`, `consent-local-application-note`, `consent-no-sse-notice-for-mcp`, `consent-sse-migration-notice`, `consent-unverified-warning`, `consent-well-known-name-warning`, `consent-form-carries-csrf-fields`, `consent-sets-transaction-cookie`. `worker.log` shows `OAuth consent shown` with `oauth_client_recognised` and `oauth_redirect_hosts`.
- **Negative path.** Check `authorize-rejects-unknown-client` expects a 4xx with no **Allow Access** button.
- **Proof.** Each invocation creates a fresh `evidence/oauth-consent-*/` directory. Its `summary.json` shows `failed: 0` and the tested commit; `run.env` records the branch. Preserve every attempt.

## Gotchas

- Do not click or submit **Allow Access** locally. `POST /authorize/consent` returns 500, because the Worker runs OIDC discovery against `AUTH0_DOMAIN=local-dummy`. That is the expected boundary, not a regression. Continue on staging.
- Launching in token mode turns this feature off. OAuth endpoints are not served, and `oauth-consent.ts` refuses to run.
- The `/sse` notice depends on `resource` sharing the authorize request's origin. A `localhost` resource against a `127.0.0.1` Worker will not show it.
- The `client_name` must be one the client policy recognises to suppress the warnings. `MCP Inspector (verify)` is deliberately unrecognised, so it shows the **Local application** note.
- Feature flags change this page. With `MCP_OAUTH_METADATA_ENABLED=true` (from PR #306) the resource metadata and consent text differ. Pass the flag with `--var` in a dedicated run and update the checks in the same PR.
