```
go build -o costs-mcp-server
chmod +x costs-mcp-server
```

For a faster feedback loop, run using the MCP inspector:
```
npx @modelcontextprotocol/inspector -e VANTAGE_BEARER_TOKEN=<token> ./costs-mcp-server
```

### Setting up MCP Server

1. Follow the instructions at https://modelcontextprotocol.io/quickstart/user

`claude_desktop_config.json` should look like:
```
{
  "mcpServers": {
    "costs-mcp-server": {
      "command": "<path_to_compiled_costs_mcp_server_binary>",
      "args": [],
      "env": {"VANTAGE_BEARER_TOKEN": "<personal_vantage_api_token>"}
    }
  }
}
```
