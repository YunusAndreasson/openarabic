#!/usr/bin/env bash
# One entry point for production app releases.
set -euo pipefail
cd "$(dirname "$0")"

usage() {
  cat <<'EOF'
Usage: ./release.sh [ios|android|all]

  ios      Trigger the GitHub Actions release workflow for iOS.
  android  Trigger the GitHub Actions release workflow for Android.
  all      Trigger the GitHub Actions release workflow for both platforms (default).
EOF
}

PLATFORM=all
for arg in "$@"; do
  case "$arg" in
    ios|android|all) PLATFORM="$arg" ;;
    -h|--help) usage; exit 0 ;;
    --check)
      echo "error: --check is not supported here; open-arabic releases run through GitHub Actions." >&2
      exit 2
      ;;
    *) echo "error: unknown argument: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

command -v gh >/dev/null || { echo "error: missing required command: gh" >&2; exit 1; }

exec gh workflow run release.yml -f "platform=$PLATFORM"
