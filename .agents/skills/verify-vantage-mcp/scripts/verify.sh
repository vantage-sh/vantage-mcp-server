#!/usr/bin/env bash
# Launch, check, and tear down isolated local instances of the hosted MCP Worker.
# Usage:
#   verify.sh launch <oauth|token> [port]   start a Worker; prints RUN_DIR
#   verify.sh doctor <run-dir>              read-only health check
#   verify.sh cleanup <run-dir>             stop the Worker and delete scratch state (keeps evidence/)
#   verify.sh list                          show runs and whether they are still up
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
RUNS_ROOT="$REPO_ROOT/tmp/verify-vantage-mcp"

die() { echo "error: $*" >&2; exit 1; }

load_run() {
  local run_dir="${1:-}"
  [ -n "$run_dir" ] || die "pass the RUN_DIR printed by launch"
  [ -f "$run_dir/run.env" ] || die "$run_dir/run.env not found"
  # shellcheck disable=SC1091
  . "$run_dir/run.env"
}

group_alive() { kill -0 -- "-$1" 2>/dev/null; }

port_owned_by_group() {
  local port="$1" pgid="$2" pid
  for pid in $(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null); do
    [ "$(ps -o pgid= -p "$pid" | tr -d ' ')" = "$pgid" ] && return 0
  done
  return 1
}

initialize_body='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"verify-vantage-mcp","version":"1"}}}'

probe_mcp() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST "$1/mcp" \
    -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    --data "$initialize_body"
}

cmd_launch() {
  local mode="${1:-}" port="${2:-}"
  case "$mode" in
    oauth) port="${port:-8788}" ;;
    token) port="${port:-8789}" ;;
    *) die "mode must be oauth or token" ;;
  esac
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    die "port $port is already in use; pick another port, never reuse an instance this run did not start"
  fi

  local run_id run_dir base_url
  run_id="$(date +%Y%m%d-%H%M%S)-$mode-$port"
  run_dir="$RUNS_ROOT/$run_id"
  base_url="http://127.0.0.1:$port"
  mkdir -p "$run_dir/state/persist" "$run_dir/evidence"

  # Passing --env-file stops Wrangler from loading .dev.vars, so the mode below
  # is authoritative even if .dev.vars sets VANTAGE_MCP_TOKEN.
  umask 077
  if [ "$mode" = token ]; then
    local token="${VERIFY_VANTAGE_TOKEN:-}"
    if [ -z "$token" ] && [ -f "$REPO_ROOT/.dev.vars" ]; then
      token="$(sed -n 's/^VANTAGE_MCP_TOKEN=//p' "$REPO_ROOT/.dev.vars" | tail -1)"
    fi
    [ -n "$token" ] || die "token mode needs VERIFY_VANTAGE_TOKEN or VANTAGE_MCP_TOKEN in .dev.vars"
    printf 'VANTAGE_MCP_TOKEN=%s\n' "$token" > "$run_dir/state/worker.env"
  else
    printf 'VANTAGE_MCP_TOKEN=\n' > "$run_dir/state/worker.env"
  fi
  umask 022

  local api_host="${VERIFY_API_HOST:-http://localhost:3000}"
  # Space-separated NAME:value pairs, for example MCP_OAUTH_METADATA_ENABLED:true.
  local extra_vars=() pair
  for pair in ${VERIFY_WORKER_VARS:-}; do
    case "$pair" in *:*) extra_vars+=(--var "$pair") ;; *) die "VERIFY_WORKER_VARS entry '$pair' is not NAME:value" ;; esac
  done
  cat > "$run_dir/run.env" <<EOF
MODE=$mode
PORT=$port
BASE_URL=$base_url
API_HOST=$api_host
WORKER_VARS="${VERIFY_WORKER_VARS:-}"
GIT_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD)
GIT_BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)
STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

  # Job control gives the Worker its own process group so cleanup can stop
  # Wrangler and its workerd children without touching anything else.
  set -m
  (
    cd "$REPO_ROOT"
    exec npx wrangler dev --env development --ip 127.0.0.1 --port "$port" \
      --inspector-port "$((port + 1000))" \
      --persist-to "$run_dir/state/persist" \
      --env-file "$run_dir/state/worker.env" \
      --var "SELF_CALLBACK_URL:$base_url/callback" \
      --var "VANTAGE_API_HOST:$api_host" \
      ${extra_vars[@]+"${extra_vars[@]}"} \
      --show-interactive-dev-session=false
  ) < /dev/null > "$run_dir/evidence/worker.log" 2>&1 &
  local pgid=$!
  set +m
  echo "PGID=$pgid" >> "$run_dir/run.env"

  local deadline=$((SECONDS + 90)) status=""
  while [ $SECONDS -lt $deadline ]; do
    group_alive "$pgid" || { tail -40 "$run_dir/evidence/worker.log" >&2; die "Wrangler exited during startup"; }
    if grep -q "Ready on" "$run_dir/evidence/worker.log"; then
      status="$(probe_mcp "$base_url" || true)"
      if { [ "$mode" = oauth ] && [ "$status" = 401 ]; } || { [ "$mode" = token ] && [ "$status" = 200 ]; }; then
        echo "READY mode=$mode url=$base_url/mcp"
        echo "RUN_DIR=$run_dir"
        return 0
      fi
    fi
    sleep 1
  done
  tail -40 "$run_dir/evidence/worker.log" >&2
  die "not usable after 90s (last POST /mcp status: ${status:-none}); run: $0 cleanup $run_dir"
}

cmd_doctor() {
  load_run "$1"
  local ok=1 status head
  check() { if [ "$2" = pass ]; then echo "PASS  $1"; else echo "FAIL  $1"; ok=0; fi; }

  if group_alive "$PGID"; then check "process group $PGID is running" pass; else check "process group $PGID is running" fail; fi
  if port_owned_by_group "$PORT" "$PGID"; then check "port $PORT is owned by this run" pass; else check "port $PORT is owned by this run" fail; fi

  head="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  if [ "$head" = "$GIT_SHA" ]; then
    echo "PASS  checkout matches launch ($GIT_BRANCH @ ${GIT_SHA:0:7})"
  else
    echo "WARN  launched at ${GIT_SHA:0:7}, checkout is now ${head:0:7}; Wrangler hot-reloads, relaunch if results look stale"
  fi

  status="$(probe_mcp "$BASE_URL" || true)"
  if [ "$MODE" = oauth ]; then
    [ "$status" = 401 ] && check "unauthenticated POST /mcp is challenged (401)" pass || check "unauthenticated POST /mcp is challenged (got ${status:-none})" fail
    status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL/.well-known/oauth-authorization-server" || true)"
    [ "$status" = 200 ] && check "authorization server metadata is served" pass || check "authorization server metadata is served (got ${status:-none})" fail
  else
    [ "$status" = 200 ] && check "token-mode POST /mcp initialize succeeds" pass || check "token-mode POST /mcp initialize succeeds (got ${status:-none})" fail
  fi
  echo "API host: $API_HOST"
  [ "$ok" = 1 ] || exit 1
}

cmd_cleanup() {
  load_run "$1"
  local run_dir="$1"
  if group_alive "$PGID"; then
    kill -TERM -- "-$PGID" 2>/dev/null || true
    local deadline=$((SECONDS + 15))
    while group_alive "$PGID" && [ $SECONDS -lt $deadline ]; do sleep 1; done
    group_alive "$PGID" && kill -KILL -- "-$PGID" 2>/dev/null || true
  fi
  rm -rf "$run_dir/state"
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "WARN  port $PORT is still in use by a process this run did not start"
  fi
  echo "stopped process group $PGID; evidence kept in $run_dir/evidence"
  {
    echo "cleaned_up_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "process_group_alive=$(group_alive "$PGID" && echo yes || echo no)"
  } > "$run_dir/evidence/cleanup.txt"
}

cmd_list() {
  [ -d "$RUNS_ROOT" ] || { echo "no runs"; return 0; }
  local run_dir
  for run_dir in "$RUNS_ROOT"/*/; do
    [ -f "$run_dir/run.env" ] || continue
    (
      # shellcheck disable=SC1091
      . "$run_dir/run.env"
      state=stopped
      group_alive "${PGID:-0}" && state=running
      echo "$state  ${run_dir%/}  $BASE_URL"
    )
  done
}

case "${1:-}" in
  launch) shift; cmd_launch "$@" ;;
  doctor) shift; cmd_doctor "$@" ;;
  cleanup) shift; cmd_cleanup "$@" ;;
  list) cmd_list ;;
  *) sed -n '2,8p' "$0"; exit 2 ;;
esac
