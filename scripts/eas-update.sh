#!/usr/bin/env bash
# The one way to publish a production OTA update (`yarn ota`). Refuses unless the
# runtime gate passes and HEAD is committed and pushed, so every update maps to a
# commit and to a binary that links the same native code.
set -euo pipefail
cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
Usage: yarn ota [ios|android|all] "<message>" [--rollout-percentage N] [--dry-run]

  ios|android|all         Platforms to publish for (default: all).
  "<message>"             Update message, required.
  --rollout-percentage N  Serve the update to N% of users (1-100; default 100).
  --dry-run               Run every check, print the eas command, publish nothing.

Publishes to branch `production` with the `production` EAS environment, which is
what store builds (channel `production`) read.
EOF
}

PLATFORM=all
MESSAGE=
ROLLOUT=
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    ios|android|all) PLATFORM="$1" ;;
    --rollout-percentage)
      [[ $# -ge 2 ]] || { echo "error: --rollout-percentage needs a value" >&2; exit 2; }
      ROLLOUT="$2"
      shift
      ;;
    --rollout-percentage=*) ROLLOUT="${1#*=}" ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
    *)
      [[ -z "$MESSAGE" ]] || { echo "error: give the message once, in quotes" >&2; exit 2; }
      MESSAGE="$1"
      ;;
  esac
  shift
done

if [[ -z "${MESSAGE// /}" ]]; then
  echo "error: an update message is required" >&2
  usage >&2
  exit 2
fi
if [[ -n "$ROLLOUT" ]] && ! [[ "$ROLLOUT" =~ ^[0-9]+$ && "$ROLLOUT" -ge 1 && "$ROLLOUT" -le 100 ]]; then
  echo "error: --rollout-percentage must be a whole number from 1 to 100" >&2
  exit 2
fi

node scripts/check-runtime.js

dirty="$(git status --porcelain --untracked-files=all)"
if [[ -n "$dirty" ]]; then
  echo "error: the working tree is not clean. Commit or stash every change first:" >&2
  printf '%s\n' "$dirty" >&2
  exit 1
fi

upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
if [[ -z "$upstream" ]]; then
  echo "error: the current branch has no upstream. Push it with: git push -u origin HEAD" >&2
  exit 1
fi
git fetch --quiet "${upstream%%/*}"
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse '@{upstream}')" ]]; then
  echo "error: HEAD does not match $upstream (ahead/behind below). Push or pull first." >&2
  git rev-list --left-right --count 'HEAD...@{upstream}' >&2
  exit 1
fi

cmd=(eas update --branch production --environment production --platform "$PLATFORM" --message "$MESSAGE")
[[ -z "$ROLLOUT" ]] || cmd+=(--rollout-percentage "$ROLLOUT")

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run, all checks passed. Would run: ${cmd[*]}"
  exit 0
fi

"${cmd[@]}"

# Sentry needs a debug ID in each bundle and its map to match them, and only
# @sentry/react-native's getSentryExpoConfig (metro.config.js) writes one.
if grep -rqs --include='*.map' '"debugId"' dist; then
  yarn sentry-expo-upload-sourcemaps dist ||
    echo "warning: the update is live, but its source maps did not upload. Retry with: yarn sentry-expo-upload-sourcemaps dist" >&2
else
  echo "warning: the update is live; source maps were not sent to Sentry because the bundles carry no debug IDs (metro.config.js does not use getSentryExpoConfig)." >&2
fi
