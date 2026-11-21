# Release & Deployment

## Web (admin-dashboard → Cloudflare Worker)

The admin panel isn't deployed: its `openarabic-web` Worker was deleted on
2026-11-08, and the website is its own repository (openarabic.io). If the owner
asks for it again, it goes out as a Cloudflare Worker via OpenNext, outside the
EAS/GitHub Actions mobile release flow below:

```bash
cd admin-dashboard
pnpm deploy   # opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

See `admin-dashboard/CLAUDE.md` for details.

## GitHub Actions Workflow Commands

Trigger release builds directly using the GitHub CLI:

```bash
# Trigger iOS-only release build
gh workflow run release.yml -f platform=ios

# Trigger Android-only release build
gh workflow run release.yml -f platform=android

# Trigger both platforms (default)
gh workflow run release.yml -f platform=all

# Check workflow status
gh workflow view release.yml
```

**When to use:**

- After fixing critical bugs that need immediate TestFlight deployment
- When testing environment variable changes in EAS builds
- To trigger manual releases outside of the automatic version bump workflow

**Notes:**

- The workflow automatically handles version bumping, building, and TestFlight/Play Store submission
- Builds use `--clear-cache` flag to ensure fresh Metro bundles
- All `EXPO_PUBLIC_*` variables are injected from GitHub Secrets

## EAS CLI Commands

```bash
# Build commands
eas build --platform ios --profile preview --clear-cache
eas build --platform android --profile production --clear-cache --non-interactive
eas build --platform all --profile development --clear-cache

# OTA updates — ALWAYS use `yarn ota` (scripts/eas-update.sh), never raw
# `eas update`. Production builds subscribe to channel `production`, which reads
# from branch `production`; any other branch silently reaches no one.
yarn ota "Fix critical bug"                               # both platforms
yarn ota ios "Fix critical bug"                           # or android
yarn ota "Fix critical bug" --rollout-percentage 10       # staged
yarn ota "Fix critical bug" --dry-run                     # checks only

# List recent builds
eas build:list --platform ios --limit 5 --non-interactive
eas build:list --status in-progress

# Inspect what's actually on each branch and which channel it feeds
eas channel:list
eas branch:list
eas update:list --branch production --limit 5

# Check authentication
eas whoami

# View project configuration
eas config
```

## OTA Pre-flight Checklist

Native dependency updates require a new binary. Runtime `1448.6.13` carries the
consent gating (`services/consent`, the Meta flags in `app.json` and the
`react-native-fbsdk-next` patch). Only a binary built with them keeps the Meta SDK
off before JS runs, so JS built from it must never be aimed at an older runtime: it
would ask for consent while that binary's SDK goes on sending to Meta for people who
refused. Runtime `1448.5.12` (2026-11-19) carries
the 2026-11-15 dependency update (`react-native-audio-api` 1.0 among the native bumps) and is
the first runtime the gate recorded (`native-runtimes.json`). `1448.5.10` is blocked: build
283 (2026-11-02) and build 284 (2026-11-15) both report it, but 284 links the 11-15 native
bumps, so no OTA may target it; both binaries stay on the JS they shipped with until users
update. `1448.5.11` was planned on 2026-11-06 and never set; it is blocked too. Runtime
`1448.5.10` carries the
2026-11-02 upgrade (`react-native-skia` 3.9.0, `react-native-executorch` 0.11,
React Native 0.88.1 and the Expo 58.0.22 native modules); JS built from it must
never be aimed at `1448.5.9` (build 282), whose binary links the older versions.
Runtime `1448.5.9` carries the
2026-10-23 `yarn fullupgrade` (`react-native-skia` 3.7.4, `mixpanel-react-native`
4 and the Expo 58.0.17 native modules, `expo-modules-core` among them); JS built
from it must never be aimed at `1448.5.7` (build 281), whose binary links the
older versions. Runtime `1448.5.7` adds the
native symbols (`expo-symbols`, the Android Material Symbols fonts and the
native `@expo/ui` switch) and drops `@react-native-community/datetimepicker`;
JS that renders `Icon` must never be aimed at `1448.5.6`, which lacks them.
Runtime `1448.5.6` separates the Skia 3 (`react-native-skia`, Graphite)
binaries from the Skia 2 builds of runtime `1448.5.3` (Expo SDK 58 / React
Native 0.88), which in turn separates SDK 58 from every SDK 57 build (runtime
`1448.4.5` and older). Publish a production OTA for a runtime only after its
native builds have shipped; until then `yarn ota` reaches no one on it. JS that
imports `react-native-skia` must never be aimed at 1448.5.3, whose binaries
link `@shopify/react-native-skia`.

`yarn ota` refuses to publish unless:

1. **The runtime gate passes** (`yarn runtime:check`, scripts/check-runtime.js).
   `native-runtimes.json` holds the iOS and Android native fingerprint of each
   `runtimeVersion` (fingerprint.config.js says what counts: native package
   versions, app.json, local plugins, native Yarn patches). A native change
   without a new runtimeVersion fails here, in `yarn verify` and in
   `eas-build-post-install`, so it can neither publish nor build. To ship one:
   set a new `runtimeVersion` in app.json, run `yarn runtime:record`, commit
   `native-runtimes.json` with the change, then `yarn release`. Never edit or
   replace an existing record; retire a broken runtime by adding it to `blocked`.
2. **The tree is clean and HEAD equals its upstream**, so the update maps to a
   pushed commit.

After publishing it uploads source maps to Sentry, but only once
`metro.config.js` uses `getSentryExpoConfig` (Sentry matches bundles by the
debug IDs that serializer writes) and `SENTRY_AUTH_TOKEN` is set. Until then
it prints a warning and skips the upload.

Then check:

1. **BrandFooter OTA hash confirms delivery** — Settings screen shows the
   current bundle's update group ID (first 8 chars). Compare against
   `eas update:list --branch production` to confirm the latest push landed.

## Build Profiles (from eas.json)

- `development` - Development builds with Expo Go
- `preview` - Internal testing builds (TestFlight/Internal Track)
- `production` - Production builds for App Store/Play Store

## What EAS uploads

`.easignore` is an allow-list: it replaces `.gitignore` for EAS and uploads only
the app (about 18 MB instead of ~200 MB with translate/, admin-dashboard/ and
docs/). A new top-level file or directory that a build needs, or a new
fingerprint source, must be added there. Check with
`eas build:inspect --platform android --stage archive --output <empty dir> --profile production`
(local only, nothing uploads).

## Critical Flags

- `--clear-cache` - **ALWAYS use this** when environment variables change or fixing cache-related issues
- `--non-interactive` - Required for CI/CD environments (GitHub Actions uses this)
- `--auto` - Auto-detect branch name and commit message for updates

## Version Management

Uses Islamic Calendar versioning:

- Format: `YEAR.MONTH.RELEASE` (e.g., `1447.2.2`)
- Build numbers maintained per platform in package.json (e.g., `1447.2.2+41`)
