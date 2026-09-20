# Bottom-sheet performance investigation — 2026-09-20

## Changes

- The reader requests `close()` through the shared sheet ref after a save is allowed. The native animation's `onClose` now performs selection cleanup; clearing the word no longer collapses dynamically measured content before the closing animation finishes.
- The mounted reader sheet retains one prepared word while hidden. The next selection replaces it, reducing repeated explanation-tree teardown and mounting. Hidden/stale selections cannot trigger save actions.
- An opening-generation guard prevents a delayed save-gate callback from dismissing a different word or a later opening of the same word.
- Native word details and Words to Revisit subscribe directly to the saved-word query. They no longer create unused due-review query observers/filtering, or inherit unrelated due-query loading/errors.
- Regression coverage exercises animation-completion cleanup and delayed callbacks. Three recorded Android flows provide repeatable reader, revisit/detail, and settings-picker paths.

Existing save-gate behavior, dependency updates, and animation constants already present in the working tree are not attributed to this investigation.

## Evidence

Argent React/Hermes and Android Perfetto captures, Pixel emulator `emulator-5556`, Metro 8082, authenticated heavy QA account. React Compiler enabled. This is a development client (`__DEV__` true), not a release benchmark; the installed native binary predates current JavaScript dependencies. iOS was not available.

| Same recorded interaction                        | Before |     After |
| ------------------------------------------------ | -----: | --------: |
| Reader word open/close: rendered fibers          |    358 | 266 / 257 |
| Reader word open/close: commits                  |     15 |   14 / 12 |
| Reader opening commit: fibers                    |    197 |       104 |
| Revisit → word → list → dismiss: rendered fibers |   1198 |      1198 |
| Revisit → word → list → dismiss: commits         |     16 |        16 |

Reader render counts fell 26–28% across two captures. Wall-clock timings were noisy: opening root commits were 157 ms before and 257.5 / 36.3 ms after; closing commits were 53.8 ms before and 121.9 / 82.4 ms after. There is **no consistent measured closing-duration improvement**. The correctness fix prevents premature content removal; render-count reduction is stronger evidence than these emulator timings.

Native word-detail mount measured 406.5 ms before and 293.8 ms after, with unchanged render counts. Removing unused query work is a structural improvement, not proof of a reproducible 28% latency gain. Perfetto prominently showed emulator goldfish/GPU transport overhead. Native jank counts varied (reader 24 before, 14 / 18 after; revisit 67 before, 59 after), so these are not production smoothness claims.

The full React report analyzer twice aborted. Commit/CPU query tools and native analysis completed; the table uses those captures, not an invented full analysis. Raw native traces/reports are session-local under `/tmp/argent-profiler-cwd/`, timestamps `20260920-161450`, `162144`, `162232`, `162609`, `162748`.

## Validation and replay

143 tests passed across eight relevant suites (reader sheet, native word detail, revisit overflow, backdrop, sheet navigation, reading integration, and save/selection hooks). Source and test TypeScript checks passed. Source lint passed with the existing 204-warning baseline. Formatting checked for changed files.

A separate targeted performance lint sweep covered the shared shell, visibility hook, reader, native word content, revisit hook, settings picker, and backdrop. Inline prop warnings were reviewed in the context of React Compiler; no blanket manual memoization was added. Existing optional-chain and `Gesture.Tap()` naming warnings do not establish a transition bottleneck.

Saved flows in `.argent/flows`:

- `bottom-sheet-word-cycle`: article 330, initial scroll, word preview off, no audio. Its canvas word lacks a label/testID, so the discovery-derived coordinate assumes the recorded 411 × 914 viewport and Noto Sans 32.
- `bottom-sheet-revisit-roundtrip`: Practice tab, no sheet; QA data includes Everything. Verifies the list, detail, return, and dismissal separately.
- `bottom-sheet-settings-roundtrip`: Account tab, no sheet; opens daily-word-limit picker and dismisses with Android back. Selecting the current option does not dismiss it; this flow tests the actual dismissal action.

All three completed full replays. These are reusable investigation flows, not a claim of release-device or iOS regression coverage.

## References

The close lifecycle uses the library's documented [ref methods](https://gorhom.dev/react-native-bottom-sheet/methods). Retaining content matters because [dynamic sizing changes snap points](https://gorhom.dev/react-native-bottom-sheet/props). Timing limitations follow Reanimated's guidance about [development versus release performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/).

A release build on physical Android and iOS hardware is the next useful measurement for remaining perceived jank. Native animation/spring tuning, arbitrary fixed heights, and audio prefetch changes were not justified by the captured evidence.

## Follow-up: shorter opening and closing transitions

The shared `BrandedBottomSheet` now supplies `useBottomSheetTimingConfigs` with an explicit 180 ms exponential ease-out. This applies to the reader word card, settings pickers, and iOS time picker. Android previously inherited the library's 250 ms timing; iOS inherited its spring. The system Reduce Motion default remains intact. Native navigator form sheets use a separate presentation implementation and are outside this timing change.

Three identical settings-picker cycles were captured before and after with temporary `onAnimate` / `onChange` timestamps. Elapsed time is from the first start callback in each transition to completion; repeated starts within an opening are included. It is not tap-to-first-frame or a UI-thread frame measurement, and JS callback scheduling/profiler overhead can inflate it.

| Callback elapsed, ms | Before        | After         |
| -------------------- | ------------- | ------------- |
| Opening, three runs  | 339, 421, 483 | 199, 212, 280 |
| Closing, three runs  | 283, 319, 329 | 284, 217, 207 |
| Median opening       | 421           | 212           |
| Median closing       | 319           | 217           |

The explicit animation duration is 28% shorter on Android. Sample medians improved by approximately 50% opening and 32% closing, but those percentages are not release-device guarantees. React counts stayed similar (841 → 855 fibers, 39 → 37 commits); this change targets motion duration, not render elimination. Native captures (`163743` before, `164023` after) still show significant emulator GPU and inspection overhead. An intervening run after Fast Refresh returned to Explore never reached the picker and was excluded.

After removing the probes, the settings roundtrip passed again and a reader word card opened and dismissed by downward drag. Forty sheet/backdrop tests, source typecheck, targeted lint and formatting passed. The test library mock now exposes the timing-config hook. No measurement globals or callbacks remain in application code. iOS was not run.

Configuration follows the library's documented [timing-config hook](https://gorhom.dev/react-native-bottom-sheet/hooks#usebottomsheettimingconfigs).
