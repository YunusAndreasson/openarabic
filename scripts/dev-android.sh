#!/usr/bin/env bash
# One-shot dev launcher: emulator + Metro + dev client.
# Usage: ./scripts/dev-android.sh    (run from repo root)
set -e

ADB=/opt/android-sdk/platform-tools/adb
APP_ID=com.edenmind.OpenArabic

# 1. Boot emulator if not already running (uses ~/.local/bin/emu).
if ! "$ADB" devices | grep -q "emulator-.*device$"; then
  echo "▶ booting emulator..."
  setsid emu >/tmp/emulator.log 2>&1 < /dev/null &
  until "$ADB" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do sleep 2; done
  echo "✓ emulator booted"
fi

# 2. Ensure dev-client-enabled build is installed; build only if missing.
# We check for the expo-dev-launcher deep-link handler, not just package
# presence — a production APK with the same package id has the same package
# name but no expo-development-client:// handler, and would silently fail
# step 3 below.
if ! "$ADB" shell cmd package query-activities --components \
      -a android.intent.action.VIEW \
      -d "$(node -p "require('./app.json').expo.scheme")://expo-development-client/" \
      2>/dev/null | grep -q "$APP_ID"; then
  echo "▶ dev client not installed (or installed APK is a release build) — running native build (5+ min)..."
  npx expo run:android
  exit $?
fi

# 3. Start Metro + open dev client. Stdin must stay attached so interactive
# keys (r, j, a, ?) work — no tee/pipe here. Expo already mirrors all output
# to .expo/dev/logs/start.log, which the agent monitor watches.
echo "▶ starting Metro + launching $APP_ID (logs mirrored to .expo/dev/logs/start.log)"
exec npx expo start --android --dev-client
