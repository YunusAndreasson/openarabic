# Release

Trigger a release build via GitHub Actions.

## Usage

```
/release [ios|android|all]
```

## Commands

**iOS only:**
```bash
gh workflow run release.yml -f platform=ios
```

**Android only:**
```bash
gh workflow run release.yml -f platform=android
```

**Both platforms (default):**
```bash
gh workflow run release.yml -f platform=all
```

**Check status:**
```bash
gh workflow view release.yml
```

## Behavior

1. Parse the platform argument (default: all)
2. Trigger the appropriate GitHub Actions workflow
3. Report that the build has been triggered
4. Optionally show how to check status

## Notes

- The workflow handles version bumping, building, and TestFlight/Play Store submission
- Builds use `--clear-cache` to ensure fresh Metro bundles
- Environment variables are injected from GitHub Secrets
