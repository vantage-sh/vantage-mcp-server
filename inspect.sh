#!/bin/bash

set -e

echo building the server...
go build -o vantage-mcp-server
npx @modelcontextprotocol/inspector@0.8.0 -e MCP_LOG_FILE=application.log -e VANTAGE_BEARER_TOKEN=$VANTAGE_BEARER_TOKEN ./vantage-mcp-server
