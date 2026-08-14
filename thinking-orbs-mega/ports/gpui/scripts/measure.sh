#!/usr/bin/env bash
# Measure steady-state CPU (% of one core) and RSS of a release binary.
# Usage: scripts/measure.sh <binary> [args...]
set -u
BIN="$1"; shift || true
"$BIN" "$@" >/tmp/orb-measure.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT
sleep 5   # let the window map + settle
if ! kill -0 "$PID" 2>/dev/null; then echo "process died:"; cat /tmp/orb-measure.log; exit 1; fi
HZ=$(getconf CLK_TCK)
for i in 1 2 3; do
  A=$(awk '{print $14+$15}' /proc/$PID/stat)
  sleep 4
  B=$(awk '{print $14+$15}' /proc/$PID/stat)
  awk -v a="$A" -v b="$B" -v hz="$HZ" -v i="$i" \
    'BEGIN{printf "sample%d  cpu=%.1f%% of one core\n", i, (b-a)/hz/4*100}'
done
awk '/^VmRSS|^Threads/{print}' /proc/$PID/status
kill "$PID" 2>/dev/null
