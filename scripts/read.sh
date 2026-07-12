#!/bin/bash
# Quick entry point for the daily Paper Reading session:
# starts the local dev server (if not already running) and opens
# the reading page in the default browser.
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=4173
URL="http://localhost:${PORT}/paper-reading/"

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  (cd "$DIR" && nohup python3 scripts/dev_server.py "$PORT" > /tmp/yifei-website-dev-server.log 2>&1 &)
  sleep 1
fi

open "$URL" 2>/dev/null || echo "Open this in your browser: $URL"
