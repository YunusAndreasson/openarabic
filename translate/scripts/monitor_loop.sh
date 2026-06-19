#!/usr/bin/env bash
#
# Watchdog for improve_loop.sh. Every INTERVAL seconds it appends a sanity line to
# grammar_improve/monitor.log covering:
#   - is the main loop still running?
#   - checkpoint cursor + how far it moved since the last check
#   - total words changed + delta
#   - count of FAIL/ERROR lines in the loop log
# It warns if the cursor has not advanced across 2 consecutive checks while the loop is
# still alive (a likely stall), and exits once the loop process is gone.
#
# Usage:  INTERVAL=900 bash scripts/monitor_loop.sh   (900s = 15 min, the default)
#
set -uo pipefail
cd "$(dirname "$0")/.."

INTERVAL="${INTERVAL:-900}"
MON="grammar_improve/monitor.log"
LOOP_LOG="grammar_improve/loop.log"

state() {
  uv run python -c "import json;c=json.load(open('grammar_improve/checkpoint.json'));print(c['cursor_sentence_id'],c['sentences_done'],c['words_changed'])" 2>/dev/null || echo "NA NA NA"
}

prev_cur=""; prev_words=""; stall=0
echo "[$(date '+%F %T')] watchdog start (interval ${INTERVAL}s)" | tee -a "$MON"

while true; do
  read -r cur sent words <<<"$(state)"
  alive="no"; pgrep -f 'improve_loop.sh' >/dev/null 2>&1 && alive="yes"
  errs="$(grep -cE 'FAIL:|failed —|apply failed|ERROR' "$LOOP_LOG" 2>/dev/null || true)"

  dcur="-"; dwords="-"
  if [ -n "$prev_cur" ]; then
    if [ "$cur" = "$prev_cur" ] && [ "$alive" = "yes" ]; then stall=$((stall+1)); else stall=0; fi
    [ "$cur" != "NA" ] && [ "$prev_cur" != "NA" ] && dcur=$((cur - prev_cur))
    [ "$words" != "NA" ] && [ "$prev_words" != "NA" ] && dwords=$((words - prev_words))
  fi

  ts="$(date '+%F %T')"
  printf '[%s] loop=%s cursor=%s (+%s) words=%s (+%s) logerrs=%s stalls=%s\n' \
    "$ts" "$alive" "$cur" "$dcur" "$words" "$dwords" "$errs" "$stall" | tee -a "$MON"

  if [ "$alive" != "yes" ]; then
    echo "[$ts] loop process gone — watchdog exiting." | tee -a "$MON"; break
  fi
  if [ "$stall" -ge 2 ]; then
    echo "[$ts] WARNING: no checkpoint progress across 2 checks (~$((INTERVAL*2/60))m). Investigate $LOOP_LOG." | tee -a "$MON"
  fi

  prev_cur="$cur"; prev_words="$words"
  sleep "$INTERVAL"
done
