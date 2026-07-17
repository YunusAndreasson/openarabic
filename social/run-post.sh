#!/usr/bin/env bash
# Thin wrapper the systemd timer / cron calls twice a day. Handles single-run
# locking + environment, then hands off to post.mjs (all logic lives there).
#
#   bash run-post.sh            # post the next queued word
#   bash run-post.sh --dry-run  # render + preview only
#   bash run-post.sh --word 5266
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Single instance — a slow post must never overlap the next timer tick.
exec 9>/tmp/openarabic-social.lock
if ! flock -n 9; then
  echo "run-post: another run in progress — exiting."
  exit 0
fi

# Load credentials/config.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Ensure node is on PATH (Hetzner provides it via mise, like the zuhd cycle).
export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"
command -v node >/dev/null 2>&1 || { echo "run-post: node not found on PATH"; exit 1; }

exec node post.mjs "$@"
