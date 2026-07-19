# Project Environment

- React Native app built with Expo SDK 57 and Expo Router; Android and iOS are supported.
- Package manager: Yarn 1.22 (`yarn.lock`). Node requirement: 20.19.5 or newer.
- Metro uses the default port 8081. Start it with `yarn start`.
- Android development launcher: `yarn dev`; native build fallback: `npx expo run:android`.
- Android application ID: `com.edenmind.OpenArabic`; iOS bundle ID: `openarabic`.
- Validation: `yarn typecheck`, `yarn lint`, targeted `yarn test`; full validation: `yarn verify`.
