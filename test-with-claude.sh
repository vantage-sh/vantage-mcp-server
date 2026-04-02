#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_KEY="vantage-local"

# Load token and host from .dev.vars
source "$REPO_DIR/.dev.vars"
VANTAGE_TOKEN="${1:-$VANTAGE_MCP_TOKEN}"

if [ -z "$VANTAGE_TOKEN" ]; then
  echo "Error: VANTAGE_MCP_TOKEN not found in .dev.vars and not provided as argument."
  exit 1
fi

# Launch Claude Code TUI with the local MCP server pointed at prod
claude --mcp-config "{\"mcpServers\":{\"$SERVER_KEY\":{\"command\":\"npx\",\"args\":[\"tsx\",\"$REPO_DIR/src/local.ts\"],\"env\":{\"VANTAGE_TOKEN\":\"$VANTAGE_TOKEN\",\"VANTAGE_API_HOST\":\"$VANTAGE_API_HOST\"}}}}"
