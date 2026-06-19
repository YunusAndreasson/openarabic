#!/usr/bin/env bash
#
# Autonomous grammar-note improvement loop.
#
#   fetch a batch  ->  Claude (headless) authors outbox.json  ->  validate  ->  apply
#   repeat until there are no more sentences.
#
# The deterministic, guard-railed steps (fetch / validate / apply / checkpoint / stop)
# live here. Only the note-authoring step calls Claude. The checkpoint advances ONLY on
# a successful apply, so killing this script at any time is safe: just restart it and it
# resumes from the last applied batch.
#
# Usage:
#   ./scripts/improve_loop.sh            # run with defaults
#   COUNT=50 MODEL=opus ./scripts/improve_loop.sh
#   nohup ./scripts/improve_loop.sh >/dev/null 2>&1 &   # detached
#
# Tunables (env vars):
#   COUNT          sentences to fetch per batch          (default 50)
#   MODEL          model for the headless Claude call    (default opus)
#   MAX_RETRIES    author attempts per batch before abort(default 2)
#   SLEEP_BETWEEN  seconds to pause between batches       (default 5)
#   APPLY          1 = apply each batch and keep looping  (default 1)
#                  0 = author + validate ONE batch, then STOP for you to review
#                      (run `uv run python scripts/improve_apply.py` yourself to apply)
#
set -euo pipefail

cd "$(dirname "$0")/.."          # project root: .../translate

COUNT="${COUNT:-50}"
MODEL="${MODEL:-opus}"
MAX_RETRIES="${MAX_RETRIES:-2}"
SLEEP_BETWEEN="${SLEEP_BETWEEN:-5}"
APPLY="${APPLY:-1}"
LOG="grammar_improve/loop.log"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG"; }

cursor() { uv run python -c "import json;print(json.load(open('grammar_improve/checkpoint.json'))['cursor_sentence_id'])" 2>/dev/null || echo '?'; }

command -v claude >/dev/null 2>&1 || { echo "ERROR: 'claude' CLI not found in PATH." >&2; exit 1; }

log "=== loop start (count=$COUNT model=$MODEL) — cursor at sentence_id $(cursor) ==="

while true; do
  # 1) fetch the next batch
  log "fetching batch (count=$COUNT)..."
  if ! uv run python scripts/improve_fetch.py --count "$COUNT" >>"$LOG" 2>&1; then
    log "fetch failed — stopping."; exit 1
  fi

  # 2) done?  (no more sentences in the fresh inbox)
  N="$(uv run python -c "import json;print(len(json.load(open('grammar_improve/inbox.json')).get('sentences',[])))")"
  if [ "$N" -eq 0 ]; then
    log "no more sentences — PASS COMPLETE. cursor at sentence_id $(cursor)."
    break
  fi
  log "fetched $N sentences."

  # 3) author outbox.json with Claude, re-trying until it passes validation
  ok=0
  for attempt in $(seq 1 "$MAX_RETRIES"); do
    log "authoring outbox (attempt $attempt/$MAX_RETRIES)..."
    cat scripts/loop_author_prompt.md \
      | claude -p --model "$MODEL" --dangerously-skip-permissions >>"$LOG" 2>&1 || true

    if uv run python scripts/validate_outbox.py >>"$LOG" 2>&1; then
      ok=1; break
    fi
    log "validation failed on attempt $attempt."
  done
  if [ "$ok" -ne 1 ]; then
    log "could not produce a valid outbox after $MAX_RETRIES attempts — stopping for review."
    exit 1
  fi

  # 4) review gate: stop here if APPLY=0 (human applies after eyeballing the outbox)
  if [ "$APPLY" -ne 1 ]; then
    log "APPLY=0 — one batch authored & validated, NOT applied. Review grammar_improve/outbox.json,"
    log "then run: uv run python scripts/improve_apply.py"
    break
  fi

  # 5) apply (advances the checkpoint)
  uv run python scripts/improve_apply.py --dry-run >>"$LOG" 2>&1
  if ! uv run python scripts/improve_apply.py >>"$LOG" 2>&1; then
    log "apply failed — stopping."; exit 1
  fi
  log "applied. cursor now at sentence_id $(cursor)."

  sleep "$SLEEP_BETWEEN"
done

log "=== loop done ==="
