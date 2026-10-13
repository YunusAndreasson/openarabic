# Project Environment

## UI audit preference

- User requested normal, realistic emulator text sizing on 2026-10-13. Keep density 420 and system font scale 1.0; do not spend more audit time on extreme 200% accessibility fixtures. Continue the full app audit at normal size and ordinary settings.

- React Native app built with Expo SDK 57 and Expo Router; Android and iOS are supported.
- Current native stack: React Native 0.86.3, Reanimated 4.5.1, React Native
  Gesture Handler 2.32.0, and React Compiler enabled.
- The Android native project is committed; iOS is generated through Expo CNG.
- Package manager: Yarn 4.18.0 (`yarn.lock`, node-modules linker). Node requirement: 20.19.5 or newer.
- Metro uses the default port 8081. Start it with `yarn start`.
- Android development launcher: `yarn dev`; native build fallback: `npx expo run:android`.
- Android application ID: `com.edenmind.OpenArabic`; iOS bundle ID: `openarabic`.
- The URL scheme is `open-arabic`; Metro explicitly disables web support.
- Argent QA account setup is available via `scripts/setup-argent-qa-account.mjs`,
  with Android helpers in `scripts/argent-adb.sh`.
- Validation: `yarn typecheck`, `yarn lint`, targeted `yarn test`; full validation: `yarn verify`.

## Android native touch fix (2026-10-13)

- Installed react-native-screens 4.26.2 is patched through Yarn for upstream PR #4489: hidden native tabs must report PointerEvents.NONE so bottom-strip content remains tappable. Both direct dependency and resolution use the same patch.
- Native debug build: from android/, `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`; Gradle can run with current Java 27. Metro can remain running.
- For preserving QA data, use in-place APK install (`adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk`); Argent reinstall clears data and permissions. Launch/open URL remains through Argent.
- QA evidence: docs/qa/ui-polish-20261013/progress.json, hiddenTabTouch. Original density 420/font scale 1.0 restored.
