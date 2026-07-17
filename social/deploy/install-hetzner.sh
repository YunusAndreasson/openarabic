#!/usr/bin/env bash
# Install the OpenArabic word-of-the-day poster as a per-user systemd timer on
# the Hetzner box. Run this ON the server, from the social/ directory, AFTER
# creating social/.env with the credentials. No root required (user units +
# linger). Re-runnable.
#
#   cd ~/repos/open-arabic/social
#   cp .env.example .env && $EDITOR .env   # fill in IG_* / X_* / keys
#   bash deploy/install-hetzner.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" # -> social/
cd "$DIR"
echo "social dir: $DIR"

if [ ! -f .env ]; then
  echo "!! social/.env not found. Copy .env.example → .env and fill it in first."
  exit 1
fi

echo "== installing node deps =="
if command -v npm >/dev/null 2>&1; then
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev
else
  echo "!! npm not found — ensure node/npm are installed (mise use -g node@lts)."
  exit 1
fi

echo "== rendering a card as a smoke test (no post) =="
node lib/card.mjs --sample >/dev/null && echo "card renderer OK"

UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

# Point the unit's WorkingDirectory at this actual checkout.
sed "s|%h/repos/open-arabic/social|$DIR|" deploy/openarabic-word.service > "$UNIT_DIR/openarabic-word.service"
cp deploy/openarabic-word.timer "$UNIT_DIR/openarabic-word.timer"

echo "== enabling user timer =="
loginctl enable-linger "$USER" 2>/dev/null || echo "(note: could not enable-linger; timer only runs while logged in)"
systemctl --user daemon-reload
systemctl --user enable --now openarabic-word.timer

echo
echo "== status =="
systemctl --user list-timers openarabic-word.timer --no-pager || true
echo
echo "Next: run one real post now with:  systemctl --user start openarabic-word.service"
echo "Logs:                              journalctl --user -u openarabic-word.service -n 50 --no-pager"
