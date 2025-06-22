**Short answer — you can do **all Android builds locally on Linux**, but you’ll _need a macOS machine somewhere_ (yours, rented, or Expo’s) for every iOS archive.**
Below is a decision map, concrete setup steps, and cost / CI advice so you can choose between local and cloud for each platform.

---

## 1  Executive overview

| Platform    | Local build on Linux?             | Typical tooling                                                                                      | When cloud is unavoidable                                                                                   |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Android** | ✅ Yes                            | Android SDK + `eas build --platform android --local` or React‑Native CLI `./gradlew assembleRelease` | Only if you want Expo’s signing service or reproducible CI builds                                           |
| **iOS**     | ❌ No (Xcode cannot run on Linux) | —                                                                                                    | Always: Expo **EAS Build** cloud, GitHub Actions macOS runner, or your own Mac / macOS VM on Apple hardware |

Building your speech‑recognition app locally for Android is straightforward; the Expo config‑plugin you’re using is supported by EAS local builds. For iOS, plan on a cloud or remote‑Mac pipeline.

---

## 2  Setting up Android builds on Linux

### 2.1 Prerequisites

- **JDK 17** or newer (Gradle 8 default).
- Android Studio “SDK Tools” tab → install **Build‑Tools 35.0.0** and the latest command‑line tools ([reactnative.dev][1]).
- Node ≥ 18, Expo CLI ≥ 7.

```bash
# one‑time
npm i -g eas-cli
eas build:configure         # writes eas.json
```

### 2.2 Building

```bash
eas build --platform android --local      # managed / prebuild
# or bare React Native
./gradlew assembleRelease                 # outputs app-release.apk
```

EAS local reproduces 100 % of the cloud pipeline as long as the Android SDK is present ([docs.expo.dev][2]). When you add `expo-speech-recognition`, `expo prebuild` wires the native module automatically; no extra Gradle edits are required.

### 2.3 Common Linux pitfalls

| Symptom                                                                    | Fix                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expo-av`/`hermes` Gradle error on `eas build --local`                     | Upgrade NDK and reinstall `sdkmanager "ndk;26.3.11579264"`; see Expo thread ([github.com][3])                                                                           |
| “Cannot find native module ExpoSpeechRecognition” while testing in Expo Go | You _must_ build a dev client or a full APK; Expo Go lacks the module ([github.com][4])                                                                                 |
| Build succeeds but voice events are `null`                                 | Always test a _development_ build (`eas build -p android --profile development`) — community reports confirm the plugin only works in a custom client ([github.com][5]) |

---

## 3  Why iOS still needs a Mac

- **Xcode is macOS‑only.** Apple explicitly states it “can only be installed on a Mac” ([forums.developer.apple.com][6], [developer.apple.com][7]).
- Apple’s licence allows virtualising macOS _only on Apple hardware_ (e.g., a Mac mini running several VMs) ([developer.apple.com][8]).

Consequently, any Linux box must off‑load iOS jobs to:

1. **EAS Build Cloud** – Expo’s hosted Macs. One‑command (`eas build -p ios`) and first 30 builds / month are free, but free jobs run at low priority and have a 2‑hour hard cap ([docs.expo.dev][9], [expo.dev][10]).
2. **GitHub Actions `macos‑latest` runner** – 3,000 free minutes/month for public repos; you can run Fastlane or `eas build --local` inside that runner.
3. **Your own Mac** – physical or a VM on Apple Silicon; teams commonly host several VMs on one M1 Mac mini for CI ([reddit.com][11]).

---

## 4  Recommended workflow for your vocabulary‑trainer app

### 4.1 Daily development

| Step                  | Command                                              | Notes                                                        |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Build dev client once | `eas build -p android --profile development --local` | Contains `expo-speech-recognition` so voice works on‑device. |
| Iterate               | `npm run start` → scan QR into dev client            | Instant reload.                                              |

### 4.2 Release pipeline

1. **Android**: run `eas build -p android --local --profile production` on your Linux CI.
2. **iOS**: trigger `eas build -p ios --profile production` _without_ `--local`, letting Expo’s Mac fleet handle signing and Xcode.

Both artifacts can then be submitted automatically via `eas submit` or Fastlane.

---

## 5  Cost & speed comparison

| Service                   | Minutes per build (speech app, release) | Typical cost                                                                  |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| **Local Linux (Android)** | 4‑7 min (cached Gradle)                 | Free, uses your CPU                                                           |
| **EAS Build Cloud (iOS)** | 8‑15 min                                | 30 free / mo, then \$0.01‑0.04 per min depending on plan ([docs.expo.dev][9]) |
| **GitHub Actions macOS**  | 12‑18 min                               | Free for public, \$0.008 / min private                                        |
| **MacStadium M1 mini**    | n/a (your pipeline)                     | ≈ \$0.27 / h reserved                                                         |

If iOS volume is low (a few releases per month), Expo’s free tier covers you; at scale, renting a Mac mini + self‑hosted runners is cheaper.

---

## 6  When might you _add_ cloud Android builds?

- You need repeatable release artifacts for compliance.
- Large team → long Gradle cache misses slow every dev laptop.
- You want OTA updates only; cloud CI ensures every build is signed by Expo so OTA channels line up with binary runtime versions ([gist.github.com][12]).

---

## 7  Key take‑aways

- **Keep Linux for Android; outsource iOS.**
- `expo-speech-recognition` works fine with local Android builds once you build a dev client.
- Plan a **dual‑track CI**: local Gradle for `.apk`, cloud Mac for `.ipa`.
- Review Expo free‑tier limits early so you’re not blocked on release day.
- If iOS volume grows, migrate to a self‑hosted Mac mini or macOS VM on Apple silicon.

With this split workflow you minimise cost, keep fast local iteration, and satisfy Apple’s toolchain requirements without ever leaving Linux as your primary dev box.

[1]: https://reactnative.dev/docs/set-up-your-environment?utm_source=chatgpt.com 'Set Up Your Environment - React Native'
[2]: https://docs.expo.dev/build-reference/local-builds/?utm_source=chatgpt.com 'Run EAS Build locally with local flag - Expo Documentation'
[3]: https://github.com/expo/eas-cli/issues/2144?utm_source=chatgpt.com 'eas build --local fails for both of my apps with the same error -> A ...'
[4]: https://github.com/jamsch/expo-speech-recognition/issues/47?utm_source=chatgpt.com 'ExpoSpeechRecognitionn not found · Issue #47 · jamsch/expo ...'
[5]: https://github.com/react-native-voice/voice/issues/504?utm_source=chatgpt.com 'Packages throws error using EXPO SDK 51 · Issue #504 - GitHub'
[6]: https://forums.developer.apple.com/forums/thread/83845?utm_source=chatgpt.com 'How I can install Xcode to my Kali Linux? - Apple Developer Forums'
[7]: https://developer.apple.com/forums/thread/68644?utm_source=chatgpt.com 'Xcode in windows pc | Apple Developer Forums'
[8]: https://developer.apple.com/documentation/virtualization/running-intel-binaries-in-linux-vms-with-rosetta?utm_source=chatgpt.com 'Running Intel Binaries in Linux VMs with Rosetta - Apple Developer'
[9]: https://docs.expo.dev/build-reference/limitations/?utm_source=chatgpt.com 'EAS Build Limitations - Expo Documentation'
[10]: https://expo.dev/changelog/2023-08-01-eas-free-plan-limits?utm_source=chatgpt.com 'Enforcement of EAS Free plan limits - Expo Changelog'
[11]: https://www.reddit.com/r/iOSProgramming/comments/18xapd0/macos_vm_on_macos_for_ios_development/?utm_source=chatgpt.com 'MacOS VM on MacOS for iOS Development : r/iOSProgramming'
[12]: https://gist.github.com/GollyJer/9668ac1125eaad3e6d8cc3309867cf9d?utm_source=chatgpt.com 'app.config.ts · GitHub'
