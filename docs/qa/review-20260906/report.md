# New-user review stress test — 2026-09-06

Android Pixel emulator, API 35, app 1448.3.12 (269), current worktree via Metro 8082. Argent 0.22.0 drove the UI. Created confirmed test account `review-new-20260906@openarabic.app` through the project's Supabase account setup; credentials are in ignored `.argent/secrets.env` under `OPEN_ARABIC_REVIEW_NEW_*`. Signup email delivery was not tested. The reusable QA account was signed out without changing its learning data.

## Findings and fixes

All three review defects found during this run are fixed in the worktree:

1. **First-run progress starts full (medium).** Fresh account → skip onboarding → Practice your first word → Add common words → Review → Android Back dismisses How it works. The first ungraded card originally displayed **100% through this round, 0 words done** ([before](first-card-full-progress.png)). Removed the 300ms no-card completion watchdog: missing data is not evidence that the scheduler completed a session. Completion now follows `useFSRS`. A regression test covers a card arriving after a non-loading, empty initialization interval. The same tutorial path with a second fresh account now starts at **0%** ([after](first-card-progress-fixed.png)). The original transient initialization race was observed once; the invalid timeout behavior is reproduced by the regression test.
2. **Microphone denial disappears on the next card (low).** Kept OS permission separate from the per-card voice phase and made denial outrank recognizer readiness. A loaded recognizer does not prove microphone access. Hook and resolver tests cover this; the emulator keeps **Enable microphone** across two card advances ([after](microphone-next-card-fixed.png)). Tapping it opens Android app settings.
3. **Double reveal can select Forgot (medium).** A second rapid tap could hit an incoming grade button before it was visible. The grade row now waits for the answer-flip duration before accepting input. Confirmed on the emulator that double Show answer leaves the grading choices visible and the word count unchanged; double Knew it then advances exactly once. A component regression test covers the guard ([after](shared-grades-double-tap-fixed.png)).

Manual grades and voice-result choices now use `ReviewChoiceRow` for common layout and red-yellow-green colors. Retry remains a retry, not a grade. Both were visually checked on Android: [manual](shared-grades-double-tap-fixed.png), [voice no-speech result](shared-voice-choices-fixed.png). Retry reopened recording, returned to the same result, and did not add a review.

Continue keeps its filled primary treatment. It already matches Show answer when Show answer is the sole primary action; Show answer is quieter when paired with the primary voice action or hands-free speaking.

## Fix validation

- Second isolated account: `review-fixes-20260906@openarabic.app`, credentials in ignored `.argent/secrets.env` under `OPEN_ARABIC_REVIEW_FIXES_*`. Fresh onboarding and starter words were exercised through the UI.
- Source and test TypeScript checks passed.
- 57 tests passed across six targeted suites: review initialization/session, voice permission/card transitions, readiness, grade-row input guard, and empty review route.
- Targeted ESLint: no errors. Nine existing warnings remain in the two review hooks; the changed components, route, and resolver are clean.
- Microphone was granted through Argent test setup after denial checks, followed by app restart. Hands-free silence returned control to the tap button. Tapped silence displayed the real voice-result row; no synthetic result was injected.
- Final fix account state: 10 starter words, two committed reviews. Voice silence and retry added none. App returned to Practice.

## Executed checks

| Case                                              | Result                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Switch returning account to newly created account | First-run onboarding appears; prior 1,200-word state does not leak                  |
| Skip general onboarding                           | Checklist remains available, initially 0/4                                          |
| Practice before saving any words                  | Clear No words yet state with Add common words and Browse articles                  |
| Add common words                                  | 10 due words, zero reviews; loading action disables itself                          |
| Dismiss first review tutorial with Android Back   | Card loads; progress issue above                                                    |
| Back before grading                               | Returns to Practice; 10 due and zero reviews remain                                 |
| Reopen aborted session                            | No repeated tutorial; progress starts at 0                                          |
| Double-tap Show answer                            | Initially passed once; follow-up exposed accidental Forgot, now fixed and rechecked |
| Double-tap Forgot                                 | One restudy/root-insight state                                                      |
| Double-tap restudy Continue                       | Advances once; one word done                                                        |
| Deny microphone permission                        | Manual reveal and grading remain usable                                             |
| Double-tap Knew it                                | Advances once; two words done                                                       |
| Force-stop and restart during third card          | Exactly two reviews persist; first-practice checklist is complete                   |
| Complete next nine-card session                   | Session complete, nine words reviewed; forgotten word returns                       |
| Decline reminder invitation                       | Completion stays usable; Continue remains available                                 |
| Return after completion                           | All caught up, 10 unique words reviewed today, 11 total reviews (one repeated word) |
| Deep-link to review with no due words             | Returns safely to caught-up Practice; no extra review counted                       |

## Artifacts and limits

Screenshots in this directory show empty Practice, the first-card progress defect, completion, and caught-up state. The no-due deep-link check was recorded and replayed successfully, with no warnings:

```sh
argent flow execute .argent/flows/review-empty-deeplink-20260906.yaml --device emulator-5554
```

Other recordings (`review-fresh-signin-20260906`, `review-abort-and-grade-20260906`, `review-complete-20260906`, `review-fixes-20260906`) are exploratory traces, **not replay-certified regression tests**. Their account/tutorial/permission state changes require explicit fixture setup before replay. `review-new-user-20260906` is an incomplete setup trace with a coordinate-capture warning on the native Account tab; do not use it as regression evidence.

No offline, audio-recognition accuracy, large-font, or physical-device claims are made. The test account remains available for follow-up testing; its 10 starter words and 11 review events are intentional test data. Metro 8081 belonged to another app and was left running.

The fix-verification trace includes failed automation sign-in attempts and startup waits. Password input was checked by length/checksum only: automated typing omitted its final character; correcting that allowed sign-in. These setup attempts are not an authentication defect claim. The trace spans a live code fix and is not suitable for unattended replay. No credentials are stored in reports or flow YAML.
