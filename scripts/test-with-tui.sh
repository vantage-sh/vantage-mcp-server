#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_KEY="vantage-local"
CLIENT="claude"

for arg in "$@"; do
  case "$arg" in
    --codex) CLIENT="codex" ;;
    --claude) CLIENT="claude" ;;
    *) echo "Error: Unknown argument '$arg'. Use --claude or --codex."; exit 1 ;;
  esac
done

# Load token and host from .dev.vars
source "$REPO_DIR/.dev.vars"
VANTAGE_TOKEN="${VANTAGE_MCP_TOKEN}"

if [ -z "$VANTAGE_TOKEN" ]; then
  echo "Error: VANTAGE_MCP_TOKEN not found in .dev.vars."
  exit 1
fi

if [ "$CLIENT" = "codex" ]; then
  # Add MCP server to codex, launch, then clean up
  codex mcp add "$SERVER_KEY" \
    --env "VANTAGE_TOKEN=$VANTAGE_TOKEN" \
    --env "VANTAGE_API_HOST=$VANTAGE_API_HOST" \
    -- npx tsx "$REPO_DIR/src/local.ts"

  codex || true

  codex mcp remove "$SERVER_KEY"
elif [ "$CLIENT" = "claude" ]; then
  claude --mcp-config "{\"mcpServers\":{\"$SERVER_KEY\":{\"command\":\"npx\",\"args\":[\"tsx\",\"$REPO_DIR/src/local.ts\"],\"env\":{\"VANTAGE_TOKEN\":\"$VANTAGE_TOKEN\",\"VANTAGE_API_HOST\":\"$VANTAGE_API_HOST\"}}}}"
else
  echo "Error: Unknown client '$CLIENT'. Use 'claude' or 'codex'."
  exit 1
fi
