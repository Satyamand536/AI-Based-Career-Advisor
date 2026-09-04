#!/usr/bin/env bash
# CareerAI dev-stack run script (used by preview_start).
#
# Supervisor style: a detached "stack keeper" restarts any daemon that the
# host reaps (MongoDB/backend/AI), which previously surfaced to users as
# "session expired" / services going offline mid-use. The React frontend stays
# foreground in a restart loop so port 3000 always comes back.
set -euo pipefail

ROOT="/tmp/hoplite/workspace"
HOPLITE="$ROOT/.hoplite"
KEEPER_PID_FILE="$HOPLITE/.keeper.pid"

# --- 1. Stack keeper (detached; restarts Mongo/backend/AI if they die) ---
if [ ! -f "$KEEPER_PID_FILE" ] || ! kill -0 "$(cat "$KEEPER_PID_FILE")" 2>/dev/null; then
  setsid nohup bash "$HOPLITE/stack_keeper.sh" >> /tmp/keeper.log 2>&1 &
  KEEPER_PID=$!
  echo "$KEEPER_PID" > "$KEEPER_PID_FILE" || true
  echo "[run] stack keeper armed (pid $KEEPER_PID)"
else
  echo "[run] stack keeper already running"
fi

# --- 2. React frontend (foreground, port 3000, auto-restart) -------------
cd "$ROOT/front"
export PORT=3000
while true; do
  npm start
  echo "[run] frontend exited ($?) — restarting in 3s"
  sleep 3
done
