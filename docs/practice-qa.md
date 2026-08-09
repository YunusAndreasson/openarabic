# Practice QA playbook

This is the durable regression guide for adding/removing practice words,
review-session lifecycle, and practice statistics. Use the reusable account and
credential handling documented in `docs/argent-qa.md`.

## Baseline capture

Before mutating data, record:

- dictionary total and exact fixture root;
- dashboard total, due count, reviewed-today count, streak, mastered count,
  and memory percentage;
- fixture FSRS state, reps, lapses, stability, difficulty, due, and last review.

Prefer a designated disposable _word_ on the persistent QA account. The account
itself is not disposable. Removing a word deletes its FSRS row; re-adding it is
a fresh card and intentionally loses that word's history.

## Mutation matrix

For every row, verify the article sheet, dictionary, dashboard, and database all
agree after invalidation/refetch.

| Scenario                             | Expected result                                                            |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Add a missing root                   | One row is inserted, total/due rise by one, daily quota rises once         |
| Double-tap Add                       | One row only; the second server no-op releases its quota reservation       |
| Add while offline/server fails       | Optimistic row rolls back and daily quota is released                      |
| Remove an existing root              | Row disappears; removal works even at quota/backlog limits                 |
| Double-tap Remove                    | Missing-row removal is an idempotent no-op; never re-adds                  |
| Remove then re-add                   | One fresh New FSRS card; old review history does not reappear              |
| Open article during study-state load | Action reads `Loading…` and is disabled until truth is known               |
| Backlog at 19/20                     | Add allowed at 19 and blocked at 20; removal remains allowed               |
| Daily limit boundary                 | Last allowed add succeeds; next add explains the configured/adaptive limit |

## Review lifecycle matrix

- Start with 0, 1, 20, and more than 20 due words.
- Abort before revealing, after revealing, on the verdict hold, and after
  advancing at least one card.
- Exercise Forgot, Guessed, Knew it, left/right swipes, and rapid duplicate
  grade taps. A grade must persist once and advance once.
- Background/foreground and force-stop on prompt playback, answer face, pending
  write, and verdict hold. Reopening must not corrupt or silently restart the
  frozen session queue.
- A missed word must return according to drill spacing; it must not repeat
  immediately or disappear behind the completed-session cooldown.
- Close must flush pending writes, invalidate practice queries, and preserve
  already graded cards. An untouched abort must not create a review.
- On completion, verify progress is 100%, session analytics fire once, and a
  backlog larger than the chunk offers the remaining work without silently
  rebuilding the completed queue.

The reusable untouched-abort flow is:

```sh
argent flow execute .argent/flows/practice-start-abort.yaml --device emulator-5554
```

## Statistics and graphs

- Open Words, Day streak, Mastered, Memory, Due, and conditional Revisit.
- Check empty, one-value, ordinary, and large datasets; rotate themes and font
  sizes where useful.
- Count-chart Y axes must not repeat rounded labels at low maxima. Grid lines
  are normalized quarters of the plot and must remain on-canvas when `yMax < 25`.
- Dashboard headline values and each sheet's Today/total summary must agree.
- Removing a word can lower the current vocabulary total. Historical growth is
  derived from currently present rows, so document any product decision about
  whether deleted vocabulary should remain in history.

## Known QA/tooling caveats (2026-08-09)

- Expo's development Tools bubble overlaps the review header close icon on the
  Android emulator. Validate the visible close icon in a build without the
  launcher overlay; Android Back is the reliable development-build abort path.
- Article navigation was observed to remain on a blank loading surface for more
  than 15 seconds, with Reanimated reporting a stale Fabric tag. A cold app
  relaunch recovered it. Treat recurrence as a separate reader/performance bug,
  but include article-to-practice entry in this practice regression.
- The corpus can expose visually near-identical lemmas as distinct root IDs
  (for example `ذِكْرٌ` and `ذِكْر`). Dictionary uniqueness is by root ID, not by
  English gloss or rendered Arabic text.
- `__tests__/integration/reviewSessionFlow.test.tsx` still contains 12 skipped,
  stale integration cases whose assumptions conflict with the current priority
  ordering and drill policy. Modern hook/visual suites cover those behaviors,
  but this obsolete suite should be rewritten or removed rather than treated as
  coverage.

## Automated checks

```sh
yarn typecheck
yarn jest --runInBand --all \
  --testPathPatterns='(practice|review|fsrs|vocabulary|chart|studyWord|dailyWord|wordClassification|newWord)'
```

At the time this playbook was written, that focused sweep passed 45 suites and
662 tests, with 16 explicitly skipped tests (12 in the stale integration file
above and four audio-specific hook cases).
