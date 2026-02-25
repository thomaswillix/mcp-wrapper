#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

WS_PORT="${WRAPPER_WS_PORT:-9001}"

echo "Stopping wrapper on port ${WS_PORT}"

# Intento via HTTP
if command -v curl >/dev/null 2>&1; then
  curl -sf -X POST "http://localhost:${WS_PORT}/__shutdown" || true
fi

# Fallback PID
if [ -f wrapper.pid ]; then
  kill "$(cat wrapper.pid)" 2>/dev/null || true
  rm -f wrapper.pid
fi
