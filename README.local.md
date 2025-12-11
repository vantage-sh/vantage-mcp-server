# `vantage-mcp-server`

Our locally ran MCP server that runs the same logic as our remote MCP for tooling. To use this, simply install the package and set `VANTAGE_TOKEN` as an environment variable that is your Vantage token.

To use this package with Claude Desktop for example, you'd use the following configuration:

```json
{
    "mcpServers": {
        "Vantage MCP Server": {
            "command": "npx",
            "args": ["-y", "vantage-mcp-server"],
            "env": {
                "VANTAGE_TOKEN": "your token goes here"
            }
        }
    }
}
```

(replace `VANTAGE_TOKEN` with your user token)
