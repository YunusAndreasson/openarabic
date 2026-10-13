#!/usr/bin/env bash
# Keep dependencies current without migrating Expo SDKs, invalidating Yarn
# patches, or crossing a version this repo deliberately holds back.
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

echo "▸ [1/6] Checking Expo SDK compatibility…"
npx expo install --check --yarn || true

echo
echo "▸ [2/6] Checking for outdated dependencies…"
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

# Supplying the unpatched, unheld direct package list lets Yarn update everything
# else without moving a dependency away from the exact version its patch targets
# or across a version this repo knows to be broken.
mapfile -t UPDATE_PACKAGES < <(node <<'NODE'
const fs = require('fs');
const pkg = require('./package.json');
const direct = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };

const patched = new Set();
// Yarn 4 patch protocol: the range itself is `patch:<pkg>@npm%3A<ver>#<patchfile>`.
// `yarn up` rewrites that range to a plain version and silently drops the patch,
// so these have to be excluded by range, not by scanning a directory.
for (const [name, range] of Object.entries(direct)) {
  if (typeof range === 'string' && range.startsWith('patch:')) patched.add(name);
}
// patch-package convention, kept for any dependency still using it.
if (fs.existsSync('patches')) {
  for (const file of fs.readdirSync('patches')) {
    const match = file.match(/^(.+)\+([^+]+)\.patch$/);
    if (!match) continue;
    patched.add(match[1].startsWith('@') ? match[1].replace('+', '/') : match[1]);
  }
}

// Versions this repo holds deliberately. Each one has broken the build or the
// test suite before; `yarn up --latest` walks straight back into them.
// Ranges this repo pins by hand. `yarn up` rewrites every range it is given to
// `^latest`, and the bundledNativeModules re-pin below cannot restore these
// because none of them is Expo-managed — so they have to be held out of `up`.
const pinned = {
  jest: '~30.4.2',
  '@jest/globals': '30.4.1',
  '@types/jest': '30.0.0',
  eslint: '10.9.0',
};

const held = {
  '@babel/runtime':
    'babel-preset-expo peers on ^7.20.0. On 8.x Yarn cannot hoist babel-preset-expo ' +
    'to the root, babel.config.js stops resolving it, and every jest suite fails.',
  '@testing-library/react-native':
    'RNTL 14 requires a `test-renderer` peer that is not installed; ~63 suites fail ' +
    'with "Cannot find module \'test-renderer\'".',
  '@react-native/jest-preset':
    'Must track the react-native version (jest-expo requests it exactly); letting it ' +
    'drift ahead of RN breaks the preset.',
};

for (const name of Object.keys(direct).sort()) {
  if (name === 'expo' || patched.has(name) || Object.hasOwn(held, name)) continue;
  if (Object.hasOwn(pinned, name)) continue;
  console.log(name);
}
console.error('  preserving installed Expo SDK: expo');
for (const name of patched) console.error(`  preserving patched dependency: ${name}`);
for (const [name, why] of Object.entries(held)) console.error(`  holding ${name}: ${why}`);
for (const [name, range] of Object.entries(pinned)) {
  console.error(`  keeping hand-pinned range for ${name}: ${range}`);
}
NODE
)

echo
if [ "$LATEST" -eq 1 ]; then
  echo "▸ [3/6] Updating unpatched dependencies to their latest releases…"
  # Yarn 4's `up` goes to latest and rewrites package.json — Yarn 1's `upgrade --latest`.
  yarn up "${UPDATE_PACKAGES[@]}"
else
  echo "▸ [3/6] Updating unpatched dependencies within declared semver ranges…"
  # `-R` re-resolves the existing ranges and touches only the lockfile — Yarn 1's bare `upgrade`.
  yarn up -R "${UPDATE_PACKAGES[@]}"
fi

echo
echo "▸ [4/6] Re-pinning Expo-managed packages to SDK-compatible versions…"
npx expo install --fix --yarn

# Keep the renderer aligned with React; Expo intentionally ignores this package.
yarn add --dev "react-test-renderer@$(node -p "require('./package.json').dependencies.react")"

echo
echo "▸ [5/6] Normalising Expo-managed ranges and deduplicating…"
# `expo install --fix` only rewrites ranges it considers INCOMPATIBLE, and it judges
# compatibility from the version installed in node_modules. Two consequences:
#   - `^57.0.19` satisfies `~57.0.19`, so every Expo range silently stays loosened
#     from `~` to `^` after `yarn up`, letting a future install cross an SDK minor.
#   - a `resolutions` entry masks the declared range entirely (a resolution of
#     `2.2.0` made `--fix` accept a declared `^3.1.1` for async-storage), so
#     package.json ends up claiming a version the project never installs.
# bundledNativeModules.json is the authority, so write its ranges in verbatim.
node <<'NODE'
const fs = require('fs');
const bundled = require('./node_modules/expo/bundledNativeModules.json');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const excluded = new Set(pkg.expo?.install?.exclude ?? []);
const changed = [];
for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  for (const name of Object.keys(pkg[field] ?? {})) {
    if (!Object.hasOwn(bundled, name) || excluded.has(name)) continue;
    // Preserve native patches and exact versions held for production OTAs.
    const resolution = pkg.resolutions?.[name];
    if (pkg[field][name].startsWith('patch:')) continue;
    if (typeof resolution === 'string' && /^\d+\.\d+\.\d+$/.test(resolution)) continue;
    if (pkg[field][name] === bundled[name]) continue;
    changed.push(`  ${name}: ${pkg[field][name]} -> ${bundled[name]}`);
    pkg[field][name] = bundled[name];
  }
}
if (changed.length) {
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log(changed.join('\n'));
} else {
  console.log('  all Expo-managed ranges already match bundledNativeModules.');
}
NODE

yarn install
# Yarn 4 does not dedupe on install: a transitive `~57.0.18` and a direct `~57.0.19`
# stay as two lockfile entries and two copies of a native module on disk.
yarn dedupe

echo
echo "▸ [6/6] Validating the installed dependency tree…"
npx expo-doctor || true

echo
echo "▸ Done. Review package.json and yarn.lock before committing."
