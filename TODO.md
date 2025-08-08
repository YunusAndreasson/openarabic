- [ ] Fix double haptic feedback on button presses (safe approach)

  - [ ] In `components/BottomControls.tsx`, pass `hapticFeedback={false}` to both internal `ThemedButton`s so only the calling handlers provide haptics
  - [ ] Keep existing `selectionFeedback()` calls in handlers used by `BottomControls` (e.g., `hooks/listen/useListenScreen.ts`) to preserve haptics when those handlers are reused elsewhere
  - [ ] Audit other `ThemedButton` usages for handler-side haptics (none found in current scans); if any, either remove handler haptics or set `hapticFeedback={false}` on those buttons to avoid doubles

- [ ] Standardize FSRS stats query keys (remove mixed `'vocabulary-stats'` usage)

  - [ ] Replace all `['vocabulary-stats']` invalidations with `FSRS_QUERY_KEYS.stats(userId)` in:
    - `components/review/CompletionScreen.tsx`
    - `hooks/vocabulary/useFSRS.ts`
    - `hooks/review/useReview.tsx`
    - `hooks/articles/useArticleMutations.ts`
  - [ ] Update `utils/queryPersistence.ts` whitelist: remove `'vocabulary-stats'` from `VOCABULARY_KEYS`; rely on `'fsrs-words'` (including `'stats'` suffix) for persistence
  - [ ] Remove `FSRS_QUERY_KEYS.VOCABULARY_STATS` if unused
  - [ ] Update tests/assertions expecting `'vocabulary-stats'` invalidations, if any

- [ ] Remove dead/unused query invalidation key

  - [ ] Delete `['studyWordsCounts', userId]` from `RELATED_QUERY_KEYS` in `hooks/articles/useArticleMutations.ts` (no queries use this key)

- [ ] Fix cache persistence exclusion for enhanced audio tracks (no behavior change to app logic)

  - [ ] In `utils/queryPersistence.ts`, change `EXCLUDED_KEYS` entry `'audio-tracks'` → `'enhancedAudioTracks'` to match actual query keys
  - [ ] Confirm `'struggling-words'` remains excluded (used in spaced mode queries)

- [ ] Add route constant for Now Playing and use it (low risk)

  - [ ] Add `NOW_PLAYING` to `constants/routes.ts`
  - [ ] Update `utils/navigationHelpers.ts` to use `ROUTE_PATHS.NOW_PLAYING` instead of hardcoded `'/NowPlaying'`
  - [ ] (Optional) Replace any remaining hardcoded references

- [ ] Tests to add/update (to guard against regressions)

  - [ ] Verify no double haptic calls for `BottomControls` primary/secondary actions (mock `expo-haptics`)
  - [ ] Verify FSRS stats invalidations use `FSRS_QUERY_KEYS.stats(userId)` and cause refetches
  - [ ] Verify query persistence does not store `'enhancedAudioTracks'` entries

- [ ] Final validation
  - [ ] Run `yarn test` and ensure all tests pass
  - [ ] Run `yarn validate` (types, lint, knip) and fix any warnings related to the refactors
