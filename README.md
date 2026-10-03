<div align="center">

# Vantage MCP Server

<h4>Use natural language to explore your organization's cloud costs via MCP clients, like Claude, Cursor, and others. Ask questions about your organization's previous and current cloud cost spend, cost tagging, provider integrations, and more.</h4>

<img src="static/img/mcp.png" alt="MCP Logo" width="600" height="auto">

</div>

## About

The Vantage MCP Server exposes tools for listing, querying, and creating Vantage resources. Tools are defined in [/src/tools](/src/tools); see the [Vantage MCP documentation](https://docs.vantage.sh/vantage_mcp) for the full tool list, prompting examples, and product details.

This repository supports two deployment modes:

| Mode                                                                             | Best for                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Hosted (Remote) MCP** — Vantage-managed at `https://mcp.vantage.sh/mcp`        | Most users and teams. OAuth sign-in, no local server to run.               |
| **Self-Hosted (Local) MCP** — stdio via `npx -y vantage-mcp-server` or this repo | API-token auth, air-gapped environments, or contributing to this codebase. |

**Start with the hosted MCP** unless you have a specific reason to self-host.

## Setup Instructions

### General

The hosted MCP server uses [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http) with OAuth 2.1. After connecting a client, a browser window prompts you to sign in to Vantage — the same account you use at [console.vantage.sh](https://console.vantage.sh/).

**Server URL:** `https://mcp.vantage.sh/mcp`

**Legacy SSE connections:** The `/sse` endpoint is deprecated and remains available during the 60-day migration
window, ending on **November 30, 2026**, when the legacy SSE endpoint will be retired. If your client uses
`https://mcp.vantage.sh/sse`, update its server URL to `https://mcp.vantage.sh/mcp`, select Streamable HTTP if it asks
for a transport, then reconnect and sign in if prompted. Some clients display a deprecation warning when connecting;
others do not.

Clients that support remote MCP natively can connect directly to that URL. For clients that only support stdio, use the `mcp-remote` bridge (see [Visual Studio Code](#visual-studio-code) below).

**API token auth:** If your client or script cannot complete OAuth, pass a [Vantage API token](https://docs.vantage.sh/vantage_account#create-an-api-token) as a Bearer token instead:

```http
Authorization: Bearer <your_vantage_api_token>
```

### Claude Code

```bash
claude mcp add --transport http vantage https://mcp.vantage.sh/mcp
```

Then run `/mcp` in a Claude Code session to complete the OAuth flow.

### Codex

```bash
codex mcp add vantage --url https://mcp.vantage.sh/mcp
```

Run `codex mcp login vantage` if Codex prompts you to authenticate.

### Cursor

The recommended install is the official Vantage plugin — in the Cursor chat panel, run:

```
/add-plugin vantage
```

To configure manually (for example, to commit `.cursor/mcp.json` to a repo):

```json
{
  "mcpServers": {
    "VantageMCP": {
      "url": "https://mcp.vantage.sh/mcp"
    }
  }
}
```

Open **Cursor Settings → Tools & MCP → New MCP Server** to edit `mcp.json`, or create `.cursor/mcp.json` in your project root.

### Claude

**Claude.ai (Team / Enterprise):** **Settings → Connectors → Add custom connector** — enter `https://mcp.vantage.sh/mcp`.

**Claude Desktop:** **Settings → Connectors** — add a custom connector with the same URL.

### Goose

1. **Extensions → Add custom extension**
2. **Type:** Streamable HTTP
3. **Endpoint:** `https://mcp.vantage.sh/mcp`

Complete the OAuth flow when Goose connects.

### Visual Studio Code

```json
{
  "mcpServers": {
    "vantage": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.vantage.sh/mcp"]
    }
  }
}
```

Or use the command palette: **MCP: Add Server → Command (stdio)** and enter:

```bash
npx -y mcp-remote https://mcp.vantage.sh/mcp
```

### Windsurf

Under **Cascade → MCP servers → Add custom server**, add:

```json
{
  "mcpServers": {
    "vantage": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.vantage.sh/mcp"]
    }
  }
}
```

### Zed

In Zed settings, add:

```json
{
  "context_servers": {
    "vantage": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.vantage.sh/mcp"],
      "env": {}
    }
  }
}
```

### Other clients

For any stdio-only MCP client, use:

- **Command:** `npx`
- **Arguments:** `-y mcp-remote https://mcp.vantage.sh/mcp`

See the [MCP clients list](https://modelcontextprotocol.io/clients) and the [Vantage MCP documentation](https://docs.vantage.sh/vantage_mcp) for additional clients (including ChatGPT via the Vantage app).

### Authorize

After configuring your client, you may need to restart it. A browser window opens for Vantage OAuth — sign in and click **Allow Access**. You can revoke access anytime under **Vantage Settings → API Access Tokens → MCP Server Token**.

Try a prompt like: _"In Vantage, which workspaces do I have access to?"_

---

## Self-Hosted (Local) MCP

Use self-hosted mode when you need API-key auth without OAuth, or when developing against this repository.

### npm package (recommended for self-host)

Install nothing — configure your MCP client to run the published package:

```json
{
  "mcpServers": {
    "Vantage": {
      "command": "npx",
      "args": ["-y", "vantage-mcp-server"],
      "env": {
        "VANTAGE_TOKEN": "<your_vantage_api_token>"
      }
    }
  }
}
```

Create a token in the [Vantage console](https://docs.vantage.sh/vantage_account#create-an-api-token). Requires [Node.js 20+](https://nodejs.org/en/download).

### From this repository (contributors)

For working on the MCP server itself:

```bash
git clone https://github.com/vantage-sh/vantage-mcp-server
cd vantage-mcp-server
npm install
```

Configure your client to run the local entrypoint (replace `<path_to_repository>` and `<personal_vantage_api_token>`):

```json
{
  "mcpServers": {
    "Vantage": {
      "command": "npx",
      "args": ["tsx", "<path_to_repository>/src/local.ts"],
      "env": { "VANTAGE_TOKEN": "<personal_vantage_api_token>" }
    }
  }
}
```

Or use the repo's installed binary directly:

```json
{
  "mcpServers": {
    "Vantage": {
      "command": "<path_to_repository>/node_modules/.bin/tsx",
      "args": ["<path_to_repository>/src/local.ts"],
      "env": { "VANTAGE_TOKEN": "<personal_vantage_api_token>" }
    }
  }
}
```

Test from the terminal: `npm run local` (requires `VANTAGE_TOKEN` in the environment).

---

## Local Development

To develop the hosted worker locally:

```bash
cp .dev.vars.example .dev.vars.development
# Edit .dev.vars.development — set VANTAGE_MCP_TOKEN to your API token
npm run dev
```

Wrangler serves the worker at `http://localhost:8787` (default). Setting `VANTAGE_MCP_TOKEN` bypasses OAuth for local testing.

---

## Running Evals

Each tool is tested with one direct prompt and one inferred prompt. Both runs load the target tool plus four distractors, then the same cases can be replayed across models. Outcomes are committed as JSON so we do not re-run the whole suite; GitHub Pages rebuilds the report from those files. The approach and full workflow are in [evals.md](evals.md).

**New tools** must ship with cases under `evals/cases/<resource>/<tool>.eval.ts`. Authoring conventions: [`.agents/skills/writing-evals/SKILL.md`](.agents/skills/writing-evals/SKILL.md).

### View outcomes locally

```bash
npm run eval:site
open evals/site/index.html
```

No model API keys required. The published report is at <https://vantage-sh.github.io/vantage-mcp-server/>.

### Run a new eval

Set `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` in `.env`, then:

```bash
npm run eval -- --tool <your-tool> --model gpt-5.6-sol-high
```

`--model` is required (`npm run eval -- --list-models` prints the catalog). That writes `evals/results/<model>/<resource>/<tool>.json` and leaves every other result file untouched. Commit the new JSON.

### Overwrite an eval

Re-run the same `--tool` and `--model`. The JSON for that pair is replaced. Do this after changing a tool's description, schema, or prompts — you do not need to re-run every model unless you want those baselines refreshed too.

---

## Available Scripts

- `npm run dev` — Start the Wrangler development server
- `npm run local` — Run the stdio MCP server locally
- `npm run inspect` — Launch the MCP inspector
- `npm run test` — Run Vitest
- `npm run format` / `npm run lint:fix` — Biome format and lint
- `npm run type-check` — TypeScript check
- `npm run cf-typegen` — Generate Cloudflare Worker types
- `npm run generate-tools-index` — Regenerate `src/tools/index.ts` after tool changes
- `npm run generate-resources-index` — Regenerate `src/resources/index.ts` after resource changes
- `npm run eval` — Run tool-selection evals (`npm run eval -- --tool <name> --model gpt-5.6-sol-high`)
- `npm run eval:site` — Merge stored JSON and write `evals/site/index.html`
- `npm run eval:view` — Open promptfoo's local results viewer

---

## Contribution Guidelines

1. Fork this repository and create a branch: `git checkout -b feature/my-feature`.
2. Make your changes.
3. Verify locally:
   ```bash
   npm run format
   npm run lint:fix
   npm run type-check
   npm test -- --run
   ```
4. Submit a [pull request](https://github.com/vantage-sh/vantage-mcp-server/pulls).

See [AGENTS.md](/AGENTS.md) for conventions when adding tools, evals, or resources.

---

## License

See [LICENSE.md](LICENSE.md) for commercial and non-commercial licensing details.

## OAuth KV retention and cleanup (ENG-2929)

Refresh grants and registered clients remain non-expiring (`refreshTokenTTL: undefined`
and `clientRegistrationTTL: undefined`). This change does not force periodic login or
expire existing clients. Access tokens retain the provider's one-hour default. A finite
retention policy remains a separate product decision.

Daily Cron Triggers run at 04:00 UTC in staging and 05:00 UTC in production. They perform
no KV reads or deletes unless `OAUTH_KV_CLEANUP_ENABLED=true` is explicitly configured.
When enabled, the scheduled handler invokes the provider's `purgeExpiredData` to remove
expired/orphaned grants and orphaned tokens. Active DCR clients and grants are preserved;
URL-based CIMD clients do not need a KV client record. No key names or values are logged.

Before enabling cleanup, inventory the selected namespace with a read-only Workers KV
API token and the Cloudflare account ID:

```bash
# Supply CLOUDFLARE_API_TOKEN through your shell environment.
npm run oauth:inventory -- <account-id> <namespace-id>
```

Namespace IDs are in `wrangler.jsonc`. The command paginates key metadata and prints only
client/grant/token/other counts and the number of keys whose KV expiration is in the past.
It does not read stored values, so it cannot identify orphaned records or grants with
application-level expiration fields. KV listings are eventually consistent; this is an
operational estimate, not a snapshot or a deletion dry-run.

Provider 0.10.3 does not persist purge cursors between invocations. Cleanup therefore
runs only when the complete grant and token listings each fit in a batch of 50 keys;
otherwise it logs a skipped sweep. Repeated calls would scan the same live prefix and
could starve later records, so large namespaces need a resumable provider implementation
before cleanup can be enabled effectively. The initial inventory has not been run by this PR.

Validate on staging with an active OAuth client, an expired grant, a grant whose DCR
client was removed, an orphaned token, and a CIMD grant. Confirm the active client can
still call a tool and refresh before enabling production. Disable the flag to stop
future sweeps; it does not restore records already removed. `OAUTH_KV` remains required
for OAuth after the MCP Durable Object migration.
