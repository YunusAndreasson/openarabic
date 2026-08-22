#!/usr/bin/env bash
# Keep Yarn Classic dependencies current without migrating Expo SDKs or
# invalidating patch-package patches.
#
# Usage:
#   yarn deps:check          # report only (default)
#   yarn deps:update         # update within declared semver ranges
#   yarn deps:update:latest  # cross major versions, then re-pin Expo packages
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
APPLY=0
LATEST=0

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --latest) LATEST=1 ;;
    --) ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "error: unknown argument '$arg' (try --help)" >&2; exit 1 ;;
  esac
done

cd "$APP_DIR"

echo "▸ [1/5] Checking Expo SDK compatibility…"
npx expo install --check --yarn || true

echo
echo "▸ [2/5] Checking for outdated dependencies…"
# NOT `yarn outdated`: Yarn 4 removed it, and with `|| true` swallowing the usage
# error this step reported nothing at all from the Yarn 4 migration onwards — the
# whole non-Expo half of the tree went unchecked while the script still printed a
# clean run. npm-check-updates reads package.json directly and is report-only
# without `-u`.
npx --yes npm-check-updates || true

if [ "$APPLY" -eq 0 ]; then
  echo
  echo "▸ Dry run complete — nothing was changed."
  echo "  Run yarn deps:update (or deps:update:latest to cross majors)."
  exit 0
fi

# Supplying the unpatched direct package list lets Yarn update everything else
# without moving a dependency away from the exact version its patch targets.
mapfile -t UPDATE_PACKAGES < <(node <<'NODE'
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');
const patched = new Set();
if (fs.existsSync('patches')) {
  for (const file of fs.readdirSync('patches')) {
    const match = file.match(/^(.+)\+([^+]+)\.patch$/);
    if (!match) continue;
    patched.add(match[1].startsWith('@') ? match[1].replace('+', '/') : match[1]);
  }
}
const direct = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
for (const name of Object.keys(direct).sort()) {
  if (name !== 'expo' && !patched.has(name)) console.log(name);
}
console.error('  preserving installed Expo SDK: expo');
for (const name of patched) console.error(`  preserving patched dependency: ${name}`);
NODE
)

echo
if [ "$LATEST" -eq 1 ]; then
  echo "▸ [3/5] Updating unpatched dependencies to their latest releases…"
  # Yarn 4's `up` goes to latest and rewrites package.json — Yarn 1's `upgrade --latest`.
  yarn up "${UPDATE_PACKAGES[@]}"
else
  echo "▸ [3/5] Updating unpatched dependencies within declared semver ranges…"
  # `-R` re-resolves the existing ranges and touches only the lockfile — Yarn 1's bare `upgrade`.
  yarn up -R "${UPDATE_PACKAGES[@]}"
fi

echo
echo "▸ [4/5] Re-pinning Expo-managed packages to SDK-compatible versions…"
npx expo install --fix --yarn

# Keep the renderer aligned with React; Expo intentionally ignores this package.
yarn add --dev "react-test-renderer@$(node -p "require('./package.json').dependencies.react")"

echo
echo "▸ [5/5] Validating the installed dependency tree…"
npx expo-doctor || true

echo
echo "▸ Done. Review package.json and yarn.lock before committing."
