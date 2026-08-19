# Project Environment

- React Native app built with Expo SDK 57 and Expo Router; Android and iOS are supported.
- Current native stack: React Native 0.86.2, Reanimated 4.5.1, React Native
  Gesture Handler 2.32.0, and React Compiler enabled.
- The Android native project is committed; iOS is generated through Expo CNG.
- Package manager: Yarn 4.18.0 (`yarn.lock`, node-modules linker). Node requirement: 20.19.5 or newer.
- Metro uses the default port 8081. Start it with `yarn start`.
- Android development launcher: `yarn dev`; native build fallback: `npx expo run:android`.
- Android application ID: `com.edenmind.OpenArabic`; iOS bundle ID: `openarabic`.
- Validation: `yarn typecheck`, `yarn lint`, targeted `yarn test`; full validation: `yarn verify`.
