# `vantage-mcp-server`

Self-hosted (local) MCP server that runs the same tools as the [hosted Vantage MCP](https://mcp.vantage.sh/mcp). Use this package when you need API-token auth without OAuth, or when you cannot reach the hosted endpoint.

**Prefer the hosted MCP?** Most clients can connect to `https://mcp.vantage.sh/mcp` with OAuth instead. See the [repo README](https://github.com/vantage-sh/vantage-mcp-server) for those instructions.

## Requirements

- [Node.js 20+](https://nodejs.org/en/download)
- A [Vantage API token](https://docs.vantage.sh/vantage_account#create-an-api-token)

Set `VANTAGE_TOKEN` to your API token in the client config (examples below).

## Claude Code

```bash
claude mcp add --transport stdio vantage --env VANTAGE_TOKEN=<your_vantage_api_token> -- npx -y vantage-mcp-server
```

## Codex

```bash
codex mcp add vantage --env VANTAGE_TOKEN=<your_vantage_api_token> -- npx -y vantage-mcp-server
```

## Cursor

Open **Cursor Settings → Tools & MCP → New MCP Server** (or create `.cursor/mcp.json` in your project):

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

## Visual Studio Code

```json
{
  "mcpServers": {
    "vantage": {
      "command": "npx",
      "args": ["-y", "vantage-mcp-server"],
      "env": {
        "VANTAGE_TOKEN": "<your_vantage_api_token>"
      }
    }
  }
}
```

Or use the command palette: **MCP: Add Server → Command (stdio)** and enter `npx -y vantage-mcp-server`, then set `VANTAGE_TOKEN` in the server env.

## Windsurf

Under **Cascade → MCP servers → Add custom server**:

```json
{
  "mcpServers": {
    "vantage": {
      "command": "npx",
      "args": ["-y", "vantage-mcp-server"],
      "env": {
        "VANTAGE_TOKEN": "<your_vantage_api_token>"
      }
    }
  }
}
```

## Zed

In Zed settings:

```json
{
  "context_servers": {
    "vantage": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "vantage-mcp-server"],
      "env": {
        "VANTAGE_TOKEN": "<your_vantage_api_token>"
      }
    }
  }
}
```

## Goose

1. **Extensions → Add custom extension**
2. **Type:** STDIO
3. **Command:** `npx`
4. **Args:** `-y vantage-mcp-server`
5. Add environment variable `VANTAGE_TOKEN` with your API token

## Claude Desktop

**Settings → Developer → Edit Config**, then add:

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

Restart Claude Desktop after saving.

## Other clients

For any stdio MCP client:

- **Command:** `npx`
- **Arguments:** `-y vantage-mcp-server`
- **Env:** `VANTAGE_TOKEN=<your_vantage_api_token>`

See the [MCP clients list](https://modelcontextprotocol.io/clients) and the [Vantage MCP documentation](https://docs.vantage.sh/vantage_mcp) for more clients and prompting examples.

## Docs & source

- [GitHub repository](https://github.com/vantage-sh/vantage-mcp-server)
- [Vantage MCP docs](https://docs.vantage.sh/vantage_mcp)
