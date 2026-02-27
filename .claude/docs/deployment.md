# Release & Deployment

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

# Update commands (OTA updates)
eas update --branch root --auto --clear-cache
eas update --branch development --message "Fix critical bug" --clear-cache

# List recent builds
eas build:list --platform ios --limit 5 --non-interactive
eas build:list --status in-progress

# Check authentication
eas whoami

# View project configuration
eas config
```

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
