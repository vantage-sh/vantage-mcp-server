# OAuth full login (staging)

A user adds the staging server to an MCP client, approves the consent screen, signs in with Auth0, and the client receives a token it uses for tool calls and reuses on reconnect. This is the only place the Auth0 leg (`/callback`, `/token`, refresh) can be verified, because local Auth0 settings are placeholders.

## Sub-features

- `staging-deploy`: the commit under test is what `hosted-mcp-staging.vantage.sh` serves.
- `staging-authorize`: Inspector completes discovery, registration, consent, and Auth0 login, and lands back connected.
- `staging-tool-call`: an authorized call such as `list-workspaces` succeeds as the signed-in user.
- `staging-reconnect`: disconnecting and reconnecting reuses the issued token without a new consent screen.
- `staging-fresh-auth`: **Clear OAuth State** forces a brand-new registration and login.
- `staging-restore`: staging is redeployed from `main` afterwards.

## How to get to it (user POV)

- In MCP Inspector, set **Transport Type** to **Streamable HTTP**, enter `https://hosted-mcp-staging.vantage.sh/mcp`, and choose **Connect**.
- Codex desktop, Cursor, or Claude configured against the same staging URL.

## Driving it with Inspector UI and gh

Preconditions:

- The user approved this staging deploy in the current conversation. Staging is shared, and this replaces whatever is deployed.
- The commit is pushed. Get its SHA with `git rev-parse HEAD`.
- The user will enter the Auth0 credentials themselves. The agent never types credentials.

- **Deploy the commit.** Run `gh workflow run "Deploy Worker Staging" --ref main -f ref=<sha>`, then `gh run list --workflow "Deploy Worker Staging" --limit 1 --json databaseId,status,createdAt` and `gh run watch <id> --exit-status`. The run concludes `success`.
- **Confirm what is live.** Run `gh run list --workflow "Deploy Worker Staging" --limit 5 --json databaseId,event,headSha,createdAt,conclusion`. Your dispatch must be the newest successful run; a later `push` run means `main` redeployed over it. `gh run view <id> --log | rg "HEAD is now at"` shows the checked-out SHA. `curl -s -o /dev/null -w '%{http_code}' https://hosted-mcp-staging.vantage.sh/.well-known/oauth-authorization-server` returns `200`.
- **Open Inspector.** Run `npm run inspector`. It opens `http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=...` in the user's browser. Set **Transport Type** to **Streamable HTTP**, the URL to `https://hosted-mcp-staging.vantage.sh/mcp`, and choose **Connect**. Inspector starts OAuth after the 401.
- **Approve and sign in (user).** The consent page on `hosted-mcp-staging.vantage.sh` names the client and shows **Allow Access**. The user approves, signs in at Auth0, and is returned to Inspector, now connected. For a step-by-step view, use **Open Auth Settings** and then **Guided OAuth Flow**; **OAuth Flow Progress** shows each stage.
- **Call a tool.** Choose **Tools**, **List Tools**, select `list-workspaces`, and choose **Run Tool**. The result is the signed-in user's workspaces and is not an error.
- **Reconnect.** Choose **Disconnect**, then **Connect**. Inspector connects without opening the consent page, and `list-workspaces` still succeeds.
- **Fresh authorization.** Choose **Clear OAuth State** in the auth settings, then **Connect**. A new registration and the consent page appear again.
- **Proof.** The user shares screenshots, or the agent reads Inspector's **History** panel. Then query Datadog read-only for `env:staging service:vantage-mcp-server` over the test window. Expect `GET /authorize` 200, `POST /authorize/consent` 302, `GET /callback` 302, `POST /token` 200, and a `tool/list-workspaces` span with no error.
- **Restore staging.** Run `gh workflow run "Deploy Worker Staging" --ref main` with no `ref` input, and watch it to `success`. Do this even if the journey failed.

## Gotchas

- Any merge to `main` triggers a staging deploy and silently replaces the commit under test. Re-run the confirm step before trusting a result, and redeploy if a `push` run landed.
- The branch's `wrangler.jsonc` is what deploys, including staging-only compatibility flags and vars. A branch that changes them changes staging for everyone until it is restored.
- Do not induce terminal refresh failures (`invalid_grant`) on shared staging. The provider-level tests cover them.
- Inspector reuses OAuth state per server URL in browser storage. If reconnect unexpectedly shows consent again, check whether state was cleared, before concluding refresh is broken.
- Production data investigations are out of scope here. Staging evidence comes from Inspector and read-only Datadog only.
