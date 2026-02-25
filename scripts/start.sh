#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Parametros
WS_PORT="${WRAPPER_WS_PORT:-9001}"
TARGET_URL="${WRAPPER_TARGET_URL:-http://localhost:8000/mcp}"

echo "Starting wrapper: WS $WS_PORT -> $TARGET_URL"

# Instalar deps solo si no existe node_modules
if [ ! -d node_modules ]; then
  npm ci --no-fund --no-audit
fi

WRAPPER_WS_PORT="$WS_PORT" WRAPPER_TARGET_URL="$TARGET_URL" \
nohup node wrapper.js > wrapper.log 2>&1 & echo $! > wrapper.pid

sleep 2
if command -v curl >/dev/null 2>&1; then
  curl -sf "http://localhost:${WS_PORT}/__health" || true
fi
