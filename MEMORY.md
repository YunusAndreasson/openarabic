# Project Environment

- React Native app built with Expo SDK 58 and Expo Router; Android and iOS are supported.
- Current native stack: React Native 0.88.1, Reanimated 4.7.1, React Native
  Gesture Handler 3.3.0, and React Compiler enabled.
- Both native projects are generated through Expo CNG; `android/` is gitignored.
- Package manager: Yarn 4.18.0 (`yarn.lock`, node-modules linker). Node requirement: 22.13+, 24.3+ or 26+ (odd majors unsupported).
- Metro uses the default port 8081. Start it with `yarn start`.
- Android development launcher: `yarn dev`; native build fallback: `npx expo run:android`.
- Android application ID: `com.edenmind.OpenArabic`; iOS bundle ID: `openarabic`.
- The URL scheme is `open-arabic`; `app.json` lists only iOS and Android as platforms.
- Argent QA account setup is available via `scripts/setup-argent-qa-account.mjs`,
  with Android helpers in `scripts/argent-adb.sh`.
- Validation: `yarn typecheck`, `yarn lint`, targeted `yarn test`; full validation: `yarn verify`.

## Android native builds

- Native debug build: from android/, `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`; Gradle can run with current Java 27. Metro can remain running.
- For preserving QA data, use in-place APK install (`adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk`); Argent reinstall clears data and permissions. Launch/open URL remains through Argent.
