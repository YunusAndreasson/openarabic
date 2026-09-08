# Review progress — 2026-09-08

The bar used `min(totalWords, 20)` as its denominator, but the scheduler continues through the whole due list. Consequently it showed 100% after 20 finished words with questions still pending. The existing helper tests explicitly required this behavior; the backlog hook test checked completion but never checked the bar while cards remained.

The denominator now matches the full session. Only finished words count, including the existing drill graduation/cap rules. Pending retries do not advance progress. An unfinished session is capped at 99% so rounding cannot announce completion early.

## Automated regression coverage

Before the fix, five assertions/tests failed across the helper and real scheduler hook suites, including 100% with an active question in both a 30-word session and a 21-word session.

After the fix, 78 tests passed across:

- `__tests__/utils/sessionProgress.test.ts`: full backlog denominator, small/empty sessions, monotonic progress, and 1,492 of 1,493 words stays below full.
- `__tests__/hooks/vocabulary/useFSRS.test.tsx`: 30-word backlog stays below 100% with a current card; 21-word session finishes 20, then misses/correctly recalls/misses/correctly recalls the final word without filling the bar, before the final correct recall completes it.
- `__tests__/hooks/vocabulary/useFSRS.edge-cases.test.tsx`: spacing queue and completion behavior.
- `__tests__/components/review/ReviewHeader.test.tsx`: rendered progress and high-water behavior.

Command: `yarn exec jest --runInBand --watch=false __tests__/utils/sessionProgress.test.ts __tests__/hooks/vocabulary/useFSRS.test.tsx __tests__/hooks/vocabulary/useFSRS.edge-cases.test.tsx __tests__/components/review/ReviewHeader.test.tsx`

Source and test TypeScript checks passed. Targeted source and test ESLint passed.

## Argent emulator check

Pixel Android emulator, API 35, Argent 0.22.0, current worktree via Metro 8081. Existing isolated `review-fixes-20260906` account, 10 due words. No synthetic runtime state or grade calls were injected: every answer was submitted through the UI.

| Action                                   | Expected and observed                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Start review                             | 0%, empty bar ([start](start.png))                                               |
| Reveal first word and choose Forgot      | 0%; feedback and Continue appear ([forgot](forgot.png))                          |
| Continue and finish the other nine words | Progress advances by 10% per finished word, reaching 90%; missed word returns    |
| Correctly recall the missed word once    | Still 90%; same word returns for its second recall ([retry](retry-still-90.png)) |
| Correctly recall it again                | Session complete, 10 words reviewed ([completion](complete.png))                 |

The 20-word boundary and large-session rounding are covered by the scheduler/helper tests; the emulator run exercises the actual rendered wrong-answer/retry path with ten words. The completion screen replaces the header, so the final numeric 100% assertion is in the scheduler test.

`walkthrough.yaml` is the raw live-recorded diagnostic trail, not a reusable QA regression test: it depends on the original ten-word account baseline, includes interval-specific labels, and has not been replayed. Do not run it against personal learning data. Automated regression protection is supplied by the Jest tests above. The walkthrough committed twelve grades to the isolated test account (one miss, nine other correct answers, two correct retries).
