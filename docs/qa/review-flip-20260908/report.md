# Review flip stress investigation — 2026-09-08

Used Argent React Native optimization/profiling workflow on the Pixel API 35 Android emulator, Expo development build, React Native 0.86.3. Test account only. Initial investigation below; subsequent authorized fixes and verification follow.

## Findings

1. **Confirmed component initialization defect:** mounting `ReviewFlipCard` with `revealed=true` initializes the answer face, but the later word-key reset effect cancels the reveal and sets flip progress to zero. A temporary Jest probe with a mutable shared-value mock reproduced expected 1, actual 0. See `mount-probe.log`; the temporary test was removed. This establishes a component defect, not that the user's midpoint glitch has this cause. Existing app remount avoidance limits its exposure.
2. **Observed midpoint disappearance:** `manual-flip-frames.jpg` samples the recording from 21 to 26 seconds at 10 fps, read left-to-right then top-to-bottom. Several consecutive frames during the reveal show neither face. The component deliberately hides both faces near the center using `seamMask`; stalls may lengthen the otherwise brief hidden interval. This recording used simultaneous profilers and emulator video capture, so it cannot establish production duration or cause.
3. **Wrong-answer overlay hypothesis:** red wash/ring views are nonrotating siblings of the rotating faces, masked only near the seam. Their geometry can disagree with the narrowed card outside that interval. The most relevant reproduction is a voice miss followed by Forgot: feedback and the reveal can overlap. This path was traced in code but has not been visually reproduced here. Also inspect multiple animated opacity styles on each overlay; the comment claiming nested multiplication does not describe the actual sibling/style-array structure.
4. **Repeated input held up:** three manual Show answer → Forgot → Continue cycles completed, including double taps on all three controls in the middle cycle. Each cycle advanced exactly one word; UI progress remained zero for unfinished missed words. This is UI evidence, not a database duplicate-write audit.

## Profiling limitations

React capture: approximately 61 seconds, 143 commits, 39 above the tool's 16 ms threshold. Full React analysis aborted, so no component hotspot conclusion is available. Native capture reported 115 jank events, with the longest approximately 513 ms. The hottest stacks were emulator GPU transport (`goldfish_pipe_read_write` and `internal_get_user_pages_fast`), which do not identify an app-code bottleneck. RSS rose about 67 MB during a short warmup/capture interval; that does not establish a leak. Combined correlation is incomplete because React analysis failed.

Raw video: `.argent/recordings/screen-recording-emulator-5554-1788894157174.mp4` (59.23 seconds). Native trace and report remain under `/tmp/argent-profiler-cwd/`, named `native-profiler-20260908-190236`.

## Next stress cases, in priority order

- Voice wrong result → Forgot while red feedback is active; record without profilers first, then repeat with instrumentation.
- Background/resume and remount while already revealed, mid-flip, and during restudy/advance. Assert face and controls agree.
- Repeat wrong → restudy → retry across many cards with rapid taps, checking unique advances and persisted grades.
- Repeat center-axis transitions in light, dark, and sepia themes, plus reduced motion.
- Compare the same recorded path on a physical device/release build before using timing numbers as performance targets.

`.argent/flows/review-manual-flip-profile-20260908.yaml` preserves the manual path with selectors and readiness gates. It was parsed successfully but has not been replay-validated; it is a draft profiling fragment, not an accepted regression test.

## Fixes and emulator verification

After approval, `ReviewFlipCard` was changed so its reveal effect is the sole writer of flip progress, including word-identity changes. The recenter effect no longer cancels a revealed mount. Each rotating face now contains its own wash and ring. This makes feedback share the face's perspective and seam opacity, while retaining the ring's independent verdict opacity.

- **44 tests passed** across the flip component, card verdict, review grading, and voice tap suites. New component regressions cover revealed mount, reveal transition, and next-word reset. Both source and test TypeScript checks, targeted source/test lint, formatting, and diff whitespace checks passed.
- **Manual flow replay passed all 30 steps** on `emulator-5554`: three reveal → Forgot → Continue cycles, including double taps. Final UI showed three words done and the fourth prompt. This supersedes the initial draft replay status above; it is still a profiling fragment, not a two-pass acceptance regression test. Video: `.argent/recordings/screen-recording-emulator-5554-1788895218374.mp4`.
- **Actual voice-result path exercised:** explicit Speak to answer with no speech produced “Didn't catch that”; tapping “No, I missed it” reached the answer/restudy face with red feedback. This is a silence-result miss, not a recognized wrong transcript. Recording: `.argent/recordings/screen-recording-emulator-5554-1788895404242.mp4`. Fast Refresh appeared later in that capture, so it is not the clean overlap evidence. The associated voice flow is recorded but not replay-validated.
- **Background/resume during restudy passed visually:** answer, red feedback, and Continue remained visible. See `resumed-restudy.png`. This does not force every possible component-remount path.
- **Clean overlap diagnostic:** Argent's debugger invoked the mounted card's existing `playVerdict('unknown')` and real reveal handler, without changing product state logic or injecting a speech transcript. The resulting native animation is in [overlap-after.mp4](overlap-after.mp4); [overlap-after.jpg](overlap-after.jpg) samples all frames at 30 fps, left-to-right then top-to-bottom. Red feedback narrows with the projected face and follows the answer face; no detached full-width rectangle was observed. Black cells at the end are unused contact-sheet cells. This diagnostic isolates rendering; it is not speech-recognition E2E coverage. Temporary debugger reference was removed.
- Runtime log registry contained 55 log entries and no warnings/errors at the inspection point. No crash/red screen was observed.

No before/after performance improvement is claimed: the initial profiled run and subsequent unprofiled recordings have different overhead, and the initial React analysis aborted. Physical-device, iOS, theme, and sustained-load validation remain outside this pass.

### Separate follow-up

After background/resume and continuing from restudy, the next card remained on “Listening…” through two waits totaling 70 seconds. Logs ended after an audio interruption/reopen sequence (`mic.interruption ended`, pause, permission/configure, stream open, session open) without a subsequent result. This is an observed voice/audio lifecycle issue that needs its own reproduction and fix; it was not changed as part of the flip repair.
