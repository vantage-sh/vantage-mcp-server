```
go build -o costs-mcp-server
chmod +x costs-mcp-server
```

For a faster feedback loop, run using the MCP inspector:
```
npx @modelcontextprotocol/inspector -e VANTAGE_BEARER_TOKEN=<token> ./costs-mcp-server
```