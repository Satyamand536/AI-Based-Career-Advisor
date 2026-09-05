#!/usr/bin/env bash
# Stack keeper — restarts any daemon that the host reaps (MongoDB, backend, AI).
# Single-instance: a lockfile prevents duplicate keepers from racing restarts.
set -uo pipefail

ROOT="/tmp/hoplite/workspace"
LOCKFILE="$ROOT/.hoplite/.keeper.lock"

# Exit silently if another keeper is already running.
if [ -f "$LOCKFILE" ] && kill -0 "$(cat "$LOCKFILE" 2>/dev/null)" 2>/dev/null; then
  exit 0
fi
echo $$ > "$LOCKFILE"

start_if_down() {
  local port="$1" name="$2" dir="$3" cmd="$4" log="$5"
  if ! lsof -ti:"$port" >/dev/null 2>&1; then
    (cd "$dir" && setsid nohup bash -c "$cmd" > "$log" 2>&1 &)
    echo "[keeper] restarted $name on $port"
  fi
}

while true; do
  start_if_down 27017 mongodb /tmp/mongo "node start.js" /tmp/mongod.log
  start_if_down 8000  backend "$ROOT/backend" "PORT=8000 node server.js" /tmp/backend_8000.log
  start_if_down 5001  ai       "$ROOT/ai" "OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 TOKENIZERS_PARALLELISM=false DEBUG=false PORT=5001 ./venv/bin/python app.py" /tmp/ai_5001.log
  sleep 8
done
