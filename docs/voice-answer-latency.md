# iOS voice-answer latency investigation

Current outcome: corrective OTA `01a06ebd` reduced observed median tap-to-mic
latency from 922 ms to 240 ms; all nine consecutive test attempts captured audio.
Keep the lightweight timing fields and existing recovery safeguards. Detailed
measurements, the rejected first approach, and release IDs follow below.

Measured on 2026-09-05 from the latest 150 iOS voice-grading timing rows,
2026-08-30 through 2026-09-02, spanning versions `1448.3.7` and `1448.3.9`. These are
observational field measurements, not a controlled before/after experiment.
No spoken answers or user identifiers are included here.

Reproduce the report using the existing Supabase CLI authentication:

```sh
node scripts/analyze-voice-quality.mjs --latency --limit 150 --days 30
```

This mode reads only iOS timing fields, groups by app version, and reports the
sample count for each metric. Missing breakdown fields in older builds remain
missing. The default mode of the script still reports recognition quality.

| Stage                                    |  Median | 90th percentile | Samples |
| ---------------------------------------- | ------: | --------------: | ------: |
| Tap to capturing                         |  958 ms |         1770 ms |     150 |
| Tap to entering `arm()`                  |   10 ms |           18 ms |     150 |
| Full post-prompt session restore         | 1151 ms |         1761 ms |     150 |
| Waiting on a queued handoff when present | 1024 ms |         1671 ms |     105 |
| Window start to first audio buffer       |  146 ms |          235 ms |     150 |

These percentiles describe different populations/overlapping spans and must not
be added together. 82 taps landed during a restore; a queued handoff can also
start after the tap, so this is not the same count as non-null handoff waits.

Grouping the same rows by version reveals a difference that the combined numbers
hide: 136 attempts on `1448.3.9` have median tap/restore times of 1068/1229 ms;
14 attempts on `1448.3.7` have medians of 164/289 ms. Device and audio-route
differences have not been controlled, so this alone does not prove a regression.
The field is `Application.nativeApplicationVersion`, not an OTA identifier.
Both version-tagged source snapshots already contain the same prompt/capture
handoff, and declare `expo-audio ~57.0.4` and `react-native-audio-api 0.13.2`.
The intervening capture change deduplicates/caches permission decisions; it does
not introduce per-card stream reconstruction. Do not infer a JS release
regression from the version grouping alone.

The dominant delay is the playback-to-recording handoff. React is a small
fraction of the measured tap latency. `useReview` already starts restoring the
input when the prompt ends. `arm()` waits for that serialized operation, then
opens a recording window. The microphone provider retains a session holder,
but closes the actual recorder for prompt playback and constructs another on
restore. Comments claiming one native recorder for the whole review were stale.

## API audit

- [React Native Audio API AudioRecorder](https://docs.swmansion.com/react-native-audio-api/docs/inputs/audio-recorder/):
  `onAudioReady`, `start`, `stop`, `pause`, `resume`, error listeners and cleanup
  are supported. The docs recommend one recorder instance and explain the
  latency/CPU tradeoff of smaller buffers. The app requests 1600 samples at
  16 kHz: 100 ms per callback. Reducing that alone cannot fix a one-second
  session handoff.
- [AudioManager](https://docs.swmansion.com/react-native-audio-api/docs/system/audio-manager/):
  session options, activation, permission checks and interruption listeners
  remain supported. Session changes should stay serialized.
- [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/):
  the playback/session path uses `expo-audio`, including `setAudioModeAsync`
  and `setIsAudioActiveAsync`, rather than the deprecated `expo-av` path.
  Current installed iOS source enables Bluetooth HFP when granting recording
  mode. The app's audio-api configuration subsequently excludes HFP. This is
  potentially redundant native route reconfiguration, but its contribution to
  the measured restore has not yet been isolated.
- [Sherpa instance STT API](https://github.com/XDcobra/react-native-sherpa-onnx/blob/main/docs/stt.md):
  `createSTT`, `transcribeSamples`, `result.text`, and `destroy` are current.
  The documented sample input is `number[]`; the current conversion from
  `Float32Array` matches that contract. Recognition is on-device, the model is
  retained across cards, and captured PCM is not written to a temporary file
  before decoding. Recognition happens after speaking, outside tap-to-listening.
- [Apple audio session preferences](https://developer.apple.com/library/archive/qa/qa1631/_index.html):
  changing an active audio session can stop/restart audio I/O. Retaining a
  paused recorder object while switching to `.playback` is not proof that its
  input graph remains usable. This needs iOS validation before changing the
  existing handoff that protects prompt volume.

## Changes and remaining validation

The tap handler rejects duplicate requests synchronously while arming. This
prevents rapid taps from canceling/restarting an accepted request. Existing
button disabling remains the normal UI guard.

The existing `meta.armStages` telemetry now separates `restoreModeMs` (granting
recording mode) and `restoreInputMs` (input configuration, opening and recovery).
This adds two timestamps to an existing operation and two fields to the existing
attempt row; it adds no React state, polling, network request or audio operation.
The breakdown survives a tap during or after the restore.

Validation: 70 focused tests pass across tap handling, capture lifecycle,
prompt telemetry, button modes and restore timing; source TypeScript passes.
Source lint reports no errors and retains existing warnings. No physical iOS
before/after run has been performed. The instrumentation OTA was subsequently
published with explicit user authorization, as recorded below.

The production-mode iOS JavaScript/Hermes export also passes:

```sh
yarn expo export --platform ios --output-dir /tmp/open-arabic-voice-validation --max-workers 2
```

This verifies bundling only. The output is not an installable iPhone app, and
includes the worktree's pre-existing dependency updates. It does not establish
native compatibility with an installed build or authorize a production OTA.

The main latency fix is still unverified. Physical iOS measurements must identify
which restore portion dominates, then compare the same prompt/tap sequence before
and after an ownership or recorder-lifecycle change. Verify audible prompt volume,
first-syllable capture, repeated cards, fast taps during prompts, permission denial,
background/foreground and interruptions, with the user's actual audio route.
Target a substantial reduction from the 958 ms median without introducing dead
input or clipped prompts. An Android emulator cannot prove this iOS result.

## Published instrumentation OTA

Published at `2026-09-04T22:54:31.564Z` (September 5 in Stockholm) to the
production branch, iOS only, runtime `1448.3.2`, matching iOS `1448.3.9` build
`266`. The production channel points to that branch.

- Update group: `2b5aff54-ad39-4102-b9be-de50ad23fb54`
- iOS update: `01a06ea1-7a8c-764e-81a7-a3d72b209096`
- Account footer identifier: `OTA 01a06ea1 · production`
- [EAS dashboard](https://expo.dev/accounts/edenmind/projects/open-arabic/updates/2b5aff54-ad39-4102-b9be-de50ad23fb54)

Release source was isolated in `/tmp/open-arabic-voice-ota`: the previously
published commit `eeba17a09c76e64c3ed93b89b38332f314d43c94` plus changes to
`useVoiceReview.ts`, `VoiceGradingProvider.tsx`, and `armTelemetry.ts`. The main
worktree's dependency updates were excluded. The isolated release passed source
typecheck and 49 targeted tests, then EAS bundled with its production environment
and confirmed publication. This OTA instruments the main delay; it does not yet
resolve the native handoff bottleneck.

## iPhone diagnostic result and direct restore candidate

Nine iOS `1448.3.9` attempts arrived between `2026-09-04T22:58:13Z` and
`22:59:14Z`, after the diagnostic OTA. Median tap-to-capturing was 922 ms,
tap-to-arm 15 ms, full restore 1026 ms, Expo recording-mode grant 571 ms,
input opening 440 ms, and first buffer 131 ms. These durations overlap and
must not be summed. The two new restore fields confirm the diagnostic code ran.

The candidate defers Expo's recording grant only on normal iOS prompt-to-input
restores. It marks playback service ownership before opening the recorder,
allowing the existing audio-api configuration/start path to switch directly to
its final category and options. Source inspection of the production 0.13.2
native recorder confirms start stops the engine, registers input (tolerating a
missing input format), then forces actual session configuration before starting
input. This removes the intermediate Expo HFP-enabled category configuration;
it does not eliminate the necessary native category switch or guarantee a
571 ms saving. After deferral, native mode work is included in `restoreInputMs`;
compare total restore/tap-to-capturing, not the now-small `restoreModeMs` alone.

Forced recovery still deactivates/closes and then force-applies the Expo grant
before rebuilding. Any forced reopen disables deferral for the provider's
remaining lifetime, including first-buffer-watchdog recovery. Prompt playback,
raw/default capture mode, no-HFP capture options, haptics, permission handling,
recorder teardown, and the existing bounded retry ladder are preserved.
Persistent failure still uses the existing quiet/record-capable fallback until
forced teardown; this change does not claim to fix that failure mode.

The candidate passes 84 tests across playback/session ownership, capture
lifecycle, tap handling, telemetry and provider fallback sequencing, plus source
and test typechecks. The same tests pass in the isolated production dependency
copy. Lint has
no errors (existing source warnings remain). Physical iOS benefit and routing
correctness remain to be checked on the user's phone after publication.

## Published direct restore OTA

Published September 5 (Stockholm), iOS production, runtime `1448.3.2`, for the
installed `1448.3.9` build. User explicitly requested publication after checks.

- Group: `6b771ae4-a079-44d2-9d1e-7f2b0dcb1716`
- iOS update: `01a06eb2-a90a-7deb-83b9-dff33eb70d29`
- Account footer: `OTA 01a06eb2 · production`
- [EAS dashboard](https://expo.dev/accounts/edenmind/projects/open-arabic/updates/6b771ae4-a079-44d2-9d1e-7f2b0dcb1716)

The isolated production source adds `services/audioPlayer.ts` to the three
runtime files in the diagnostic release. Production package/lockfile remain
unchanged. Hermes export and publication succeeded; 84 targeted tests and both
typechecks passed before publication. On-device benefit remains unverified.
The previous diagnostic group above is the known rollback target if prompt
volume, capture, or latency regresses.

## Second-word failure and preventive reset correction

The direct-restore OTA FAILED physical iOS validation. The first captured word
at `2026-09-04T23:15:33Z` delivered 25 buffers; its restore was 690 ms (mode 0,
input 690). Subsequent attempts at 23:15:40–23:16:59 failed native recorder
startup despite an active playAndRecord/default session, options 8, 48 kHz,
one built-in input channel and speaker output. The existing fallback did not
recover this state. A rollback request failed before publication; the user
explicitly canceled rollback because they are the only tester and requested
one corrective OTA instead.

The earlier static reasoning missed input attachment BEFORE forced activation.
After playback, audio-api's desired configuration and cached active flag can
both remain unchanged. Its pre-start set-options and activate calls then skip
work, allowing input attachment against the playback category. The final forced
activation repairs the category too late to guarantee a valid input graph.
The reported native errors support a graph-start failure; the exact OS engine
failure is not exposed by the current diagnostic error wrapper.

The correction closes capture and explicitly awaits successful audio-api
session deactivation inside the serialized normal iOS restore, BEFORE marking
deferred ownership and opening capture. Existing configure→activate→start then
reapplies the actual category before attachment. A rejected deactivation disables
deferral and chooses the established Expo grant. Owed/forced recovery retains
its old path. Playback and active capture remain protected by existing guards.
No native dependencies change. The reset duration is included in restoreModeMs,
so total restore and tap latency remain the comparison metrics.

This is a preventive correction, not proof that an already damaged native engine
can recover in place. Fully restart the app when loading the corrective OTA,
then verify multiple words, microphone capture and audible prompt volume.

Corrective validation: 86 targeted tests pass against the isolated production
lockfile (81 capture/playback/tap/timing tests plus 5 provider handoff tests).
Provider coverage checks two consecutive restores with logical ownership and
native readiness modeled separately, a pending reset that blocks opening,
a rejected reset that disables deferral, forced-recovery ordering, and playback
teardown. Source and test typechecks pass; lint has no errors and existing
source warnings. These checks cannot reproduce the real AVAudioEngine graph.

Corrective OTA published to iOS production, runtime `1448.3.2`:

- Group: `7b5965eb-efca-41b7-81be-5f082d110055`
- iOS update: `01a06ebd-1181-7972-86ba-64dc302f6436`
- Account footer: `OTA 01a06ebd · production`
- [EAS dashboard](https://expo.dev/accounts/edenmind/projects/open-arabic/updates/7b5965eb-efca-41b7-81be-5f082d110055)

Hermes export and publication succeeded. The user's full-restart and multi-word
iPhone test is pending; do not treat publication or mocks as verified recovery.

## Corrective iPhone result

User reported faster behavior. Nine attempts after corrective publication
(`2026-09-04T23:26:01Z`–`23:26:50Z`) all delivered buffers, with zero logged
arm failures. Compared with the nine diagnostic baseline attempts:

| Metric                           | Diagnostic median | Corrective median |
| -------------------------------- | ----------------: | ----------------: |
| Tap to capturing                 |            922 ms |            240 ms |
| Full restore                     |           1026 ms |            318 ms |
| Restore grant/reset portion      |            571 ms |             28 ms |
| Restore input portion            |            440 ms |            285 ms |
| First buffer after window starts |            131 ms |            219 ms |

Median tap latency fell about 74%; restore fell about 69%. The first corrective
attempt still took 898 ms and another took 572 ms; the remaining seven were
208–255 ms. This is encouraging repeated-word evidence, not comprehensive
interruption/route regression coverage. Cohorts use publication time windows,
not a persisted per-attempt OTA ID. No new update was published for this check.
