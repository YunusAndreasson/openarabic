# Release & Deployment

## Web (admin-dashboard → Cloudflare Worker)

The Next.js web app deploys as the `openarabic-web` Cloudflare Worker via
OpenNext — it is NOT part of the EAS/GitHub Actions mobile release flow below:

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

# OTA updates — ALWAYS use the yarn scripts, never raw `--branch root`.
# Production builds (TestFlight + App Store) subscribe to channel `production`,
# which reads from branch `production`. Pushing to `root` or any other branch
# silently does nothing for prod binaries.
yarn ota "Fix critical bug"           # iOS prod channel
yarn ota:android "Fix critical bug"   # Android prod channel
yarn ota:all "Fix critical bug"       # both platforms, prod channel

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

Native dependency updates require a new binary. Runtime `1448.5.7` adds the
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

Before publishing an OTA, verify:

1. **Local is in sync with origin** — `yarn release` auto-bumps app version
   and commits to origin via the GitHub workflow. If you have local commits
   that haven't been pushed yet, the binary that gets built from origin will
   not include them. Run `git pull --rebase` and check `git status` is clean
   before publishing OTAs.
2. **OTA bundle's native modules match the running binary's** — adding a
   native dependency (anything in `package.json` that ships a `.podspec` /
   Android Gradle module) means existing TestFlight builds don't have it
   linked. Pushing JS that imports the new module can either silently
   no-op or crash on launch, in which case expo-updates rolls back to the
   embedded bundle. New native deps require a fresh `yarn release`.
3. **BrandFooter OTA hash confirms delivery** — Settings screen shows the
   current bundle's update group ID (first 8 chars). Compare against
   `eas update:list --branch production` to confirm the latest push landed.

## Build Profiles (from eas.json)

- `development` - Development builds with Expo Go
- `preview` - Internal testing builds (TestFlight/Internal Track)
- `production` - Production builds for App Store/Play Store

## Critical Flags

- `--clear-cache` - **ALWAYS use this** when environment variables change or fixing cache-related issues
- `--non-interactive` - Required for CI/CD environments (GitHub Actions uses this)
- `--auto` - Auto-detect branch name and commit message for updates

## Version Management

Uses Islamic Calendar versioning:

- Format: `YEAR.MONTH.RELEASE` (e.g., `1447.2.2`)
- Build numbers maintained per platform in package.json (e.g., `1447.2.2+41`)
