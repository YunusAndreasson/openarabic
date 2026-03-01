# Dead Code Analysis

Generated: 2026-01-10
Status: **Phase 3 Complete** - All REVIEW and CONSIDER USE items resolved; filtersSlice removed

## Cleanup Summary

### Phase 1 (Initial)

- 24 dead code items removed

### Phase 2 (Additional Cleanup)

- Deleted 3 entire files: `navigationUtils.ts`, `buttonStyleUtils.ts`, `useAndroidBackGesture.ts`
- Removed 4 more unused functions: `generateFutureDateRange`, `generatePastDateRange`, `createTranslationTextStyle`, `determineTextColor`
- DRY refactored `useThemeDetection.ts`: `useIsDarkMode` now uses `useCurrentTheme` internally (removed ~20 lines of duplicated logic)

### Phase 3 (REVIEW/CONSIDER USE Resolution + filtersSlice)

- Deleted `store/filtersSlice.ts` (empty reducers, state was always initial values). Updated `useFilteredArticles.ts` to use hardcoded constants instead of Redux. Removed from `store/store.ts`, `store/index.ts`, `__tests__/helpers/testStore.tsx`. Deleted `__tests__/store/filtersSlice.test.ts`.
- Removed `calculateSevenDayAverage` from `utils/chartDataUtils.ts` and its re-export in `components/common/charts/index.ts`
- Removed `CHART_LAYOUT` from `constants/chartConstants.ts` and its re-export in `components/common/charts/index.ts`
- Deleted `hooks/app/useArticlesAndDueWordsLoaded.ts` (`useReadTabDataLoaded` had no consumers). Removed from `hooks/app/index.ts`.
- Removed `Route` discriminated union type from `types/navigation.types.ts` (no consumers; codebase uses `ROUTE_PATHS` + Expo Router directly)
- Removed `export` from `useCurrentTheme` in `hooks/theme/useThemeDetection.ts` (only used internally by `useIsDarkMode`)
- Deleted `hooks/playlist/useAddBeginnerArticles.ts` and `hooks/practice/useAddCommonWords.ts` (no active consumers; onboarding not planned). Removed from barrel exports.

## Method

Ran knip with aggressive settings to find more potential dead code:

```json
{
  "ignoreExportsUsedInFile": true,
  "includeEntryExports": true
}
```

Command: `npx knip -c /tmp/knip-aggressive.json --exports --no-config-hints`

Each finding was validated by searching for usages across the codebase.

---

## Legend

| Action         | Meaning                                            |
| -------------- | -------------------------------------------------- |
| `DELETE`       | Safe to remove, no value                           |
| `CONSIDER USE` | Well-implemented, could be used instead of deleted |
| `KEEP`         | Intentionally public API or test utility           |
| `REVIEW`       | Needs manual review before decision                |

---

## 1. Navigation Utilities

**File: `utils/navigationUtils.ts`**

### Analysis

This file provides type-safe navigation wrappers with validation. The functions wrap expo-router's `router.push/replace/back` with:

- Parameter validation (null/undefined checks)
- Error handling (try/catch)
- Return boolean indicating success/failure

### Exports

| Export                  | Action         | Rationale                                                                                                         |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `navigateToArticle`     | `CONSIDER USE` | Well-designed wrapper with ArticleId validation. Could replace direct `router.push` calls for article navigation. |
| `navigateToStudyReview` | `CONSIDER USE` | Validates RootId and mode params before navigation. Could improve robustness.                                     |
| `navigateBack`          | `DELETE`       | Trivial wrapper, `router.back()` is sufficient.                                                                   |
| `navigateReplace`       | `DELETE`       | Trivial wrapper, adds little value.                                                                               |
| `validateAndNavigate`   | `DELETE`       | Generic abstraction with no clear use case.                                                                       |

### Recommendation

Either:

1. **Use it**: Adopt `navigateToArticle` and `navigateToStudyReview` in components that navigate to these routes
2. **Delete entire file**: If the codebase prefers direct router calls

---

## 2. Text Style Utilities

**File: `utils/textStyleUtils.ts`**

### Analysis

Provides utilities for creating consistent text styles, particularly for Arabic text and meaning overlays.

### Exports

| Export                          | Action   | Rationale                                                                                           |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `createTranslationTextStyle`    | `REVIEW` | Creates consistent translation text styling. Check if components inline similar styles.             |
| `calculateFontSize`             | `DELETE` | Calculates font size based on warning/vague/struggling flags. Very specific logic, likely outdated. |
| `createMeaningOverlayTextStyle` | `DELETE` | Trivial - just merges color and fontSize into base style.                                           |

### Recommendation

Review `createTranslationTextStyle` - if components have similar inline styles, consolidate. Otherwise delete all three.

---

## 3. Button Style Utilities

**File: `utils/buttonStyleUtils.ts`**

### Analysis

Defines shared styles for header buttons.

### Exports

| Export                     | Action         | Rationale                                                                               |
| -------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `HEADER_BUTTON_STYLE`      | `CONSIDER USE` | ViewStyle constant for header buttons. Check if DoneButton/EditModeButton could use it. |
| `HEADER_BUTTON_TEXT_STYLE` | `CONSIDER USE` | TextStyle for header button text. Same consideration.                                   |

### Recommendation

Search for header button components and check if they duplicate these styles. If so, adopt these constants. If styles differ, delete this file.

---

## 4. Date/Time Utilities

**File: `utils/dateTimeUtils.ts`**

### Analysis

Provides date range generation for charts.

### Exports

| Export                    | Action   | Rationale                                                                                             |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `generateFutureDateRange` | `REVIEW` | Docstring says "Used by FSRS charts for due word predictions". Check if charts generate dates inline. |
| `generatePastDateRange`   | `REVIEW` | Docstring says "Used by study streak charts". Same consideration.                                     |

### Recommendation

Check chart implementations. If they generate date ranges inline with similar logic, adopt these utilities. Otherwise delete.

---

## 5. Chart Data Utilities

**File: `utils/chartDataUtils.ts`**

### Analysis

Re-exported in `components/common/charts/index.ts` but imports never use these specific functions.

### Exports

| Export                     | Action   | Rationale                                                                  |
| -------------------------- | -------- | -------------------------------------------------------------------------- |
| `getUTCDateString`         | `DELETE` | Simple date-to-string, can use inline `toISOString().split('T')[0]`        |
| `isSameDay`                | `DELETE` | Simple comparison, can be inlined                                          |
| `calculateSevenDayAverage` | `REVIEW` | More complex logic. Check if any chart could benefit from 7-day averaging. |

---

## 6. Type Mappers

**File: `utils/typeMappers.ts`**

### Exports

| Export            | Action   | Rationale                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------- |
| `mapToStudyWords` | `DELETE` | Maps DB rows to StudyWord type. If unused, likely obsolete after refactoring. |

---

## 7. Arabic Analysis

**File: `utils/arabicAnalysis/validationConstants.ts`**

| Export               | Action   | Rationale                                                    |
| -------------------- | -------- | ------------------------------------------------------------ |
| `COMPONENT_COUNT`    | `KEEP`   | Referenced in `__tests__/BASELINE.md` for test documentation |
| `meetsMinimumLength` | `DELETE` | Validation function never used                               |

**File: `utils/arabicAnalysis/constants.ts`**

| Export                | Action | Rationale                                              |
| --------------------- | ------ | ------------------------------------------------------ |
| `STANDALONE_PRONOUNS` | `KEEP` | Used in `__tests__/utils/test-fahuwa-coloring.test.ts` |

---

## 8. Haptics

**File: `utils/haptics.ts`**

### Analysis

Android-specific haptic feedback variants.

### Exports

| Export                  | Action   | Rationale                                                                         |
| ----------------------- | -------- | --------------------------------------------------------------------------------- |
| `androidRippleFeedback` | `DELETE` | Same as `lightFeedback()`. Android ripple is visual, not haptic. Misleading name. |
| `androidPressFeedback`  | `DELETE` | Same as `mediumFeedback()`. No differentiation needed.                            |

### Recommendation

Delete both. Use `lightFeedback`/`mediumFeedback` directly.

---

## 9. Hooks - Theme

**File: `hooks/theme/useSystemUITheme.ts`**

| Export                       | Action   | Rationale                               |
| ---------------------------- | -------- | --------------------------------------- |
| `getSystemUIBackgroundColor` | `DELETE` | Internal helper, should not be exported |

**File: `hooks/theme/useThemeDetection.ts`**

| Export            | Action         | Rationale                                                                                          |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------- |
| `useCurrentTheme` | `CONSIDER USE` | Returns Theme enum vs boolean. Could be useful if components need theme name, not just dark/light. |

### Recommendation

Check if any component needs the Theme enum. If not, delete. If so, consider using.

---

## 10. Hooks - UI

**File: `hooks/ui/useAndroidBackGesture.ts`**

### Analysis

Custom Android back button handler hook.

| Export                  | Action         | Rationale                                                                        |
| ----------------------- | -------------- | -------------------------------------------------------------------------------- |
| `useAndroidBackGesture` | `CONSIDER USE` | Well-implemented hook for Android back button. Could be useful in modals/sheets. |

### Recommendation

Check if any screens need custom back button behavior. If modal sheets need this, adopt it. Otherwise delete.

---

## 11. Hooks - Animations

**File: `hooks/animations/usePressAnimation.ts`**

| Export                 | Action   | Rationale                                               |
| ---------------------- | -------- | ------------------------------------------------------- |
| `PRESS_ANIMATION_WORD` | `DELETE` | Animation config constant. If not imported, not needed. |

---

## 12. Hooks - App/Playlist/Practice

These hooks are re-exported through index files but never imported elsewhere.

**File: `hooks/app/useArticlesAndDueWordsLoaded.ts`**

| Export                 | Action   | Rationale                                                                      |
| ---------------------- | -------- | ------------------------------------------------------------------------------ |
| `useReadTabDataLoaded` | `REVIEW` | Checks if articles and due words are loaded. May be useful for loading states. |

**File: `hooks/playlist/useAddBeginnerArticles.ts`**

| Export                   | Action         | Rationale                                                                                                 |
| ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| `useAddBeginnerArticles` | `CONSIDER USE` | Fully implemented hook to add 10 beginner articles. Could power an onboarding feature or empty state CTA. |

**File: `hooks/practice/useAddCommonWords.ts`**

| Export              | Action         | Rationale                                                                                                   |
| ------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `useAddCommonWords` | `CONSIDER USE` | Fully implemented hook to add 10 common Arabic words. Could power an onboarding feature or empty state CTA. |

### Recommendation

These hooks are production-ready. Consider:

1. Adding "Get Started" buttons that use these hooks for new users
2. Or delete if onboarding is handled differently

---

## 13. Unused Types

| File                                   | Type                     | Action   | Rationale                                                                         |
| -------------------------------------- | ------------------------ | -------- | --------------------------------------------------------------------------------- |
| `hooks/account/useAccountScreen.ts`    | `UseAccountScreenReturn` | `DELETE` | Internal return type, no need to export                                           |
| `hooks/articles/useReadingProgress.ts` | `ReadingProgressData`    | `DELETE` | Internal interface, no need to export                                             |
| `services/vocabularyStats.ts`          | `VocabularyStatsService` | `DELETE` | Internal service type, no need to export                                          |
| `services/studyStreak.ts`              | `DailyStudyActivity`     | `DELETE` | Internal type, no need to export                                                  |
| `types/ui/theme.types.ts`              | `ThemeColorName`         | `DELETE` | Never used                                                                        |
| `types/ui/review.types.ts`             | `ErrorMessageProps`      | `DELETE` | Never used                                                                        |
| `types/navigation.types.ts`            | `Route`                  | `REVIEW` | Discriminated union for type-safe navigation. Could be useful but needs adoption. |
| `types/vocabulary.types.ts`            | `StatCategory`           | `DELETE` | Unused - VocabularyStatCategory enum is used instead                              |
| `utils/priorityQueue.ts`               | `PriorityItem`           | `DELETE` | Internal interface                                                                |
| `constants/fonts.ts`                   | `FontFamily`             | `KEEP`   | Used in tests                                                                     |

---

## 14. Unused Enum Members

| File             | Enum.Member                        | Action   | Rationale                             |
| ---------------- | ---------------------------------- | -------- | ------------------------------------- |
| `types/enums.ts` | `DailyWordLimitStatus.APPROACHING` | `DELETE` | Only REACHED and NOT_REACHED are used |

---

## 15. Constants

**File: `constants/layout.ts`**

| Export          | Action   | Rationale  |
| --------------- | -------- | ---------- |
| `OPACITY_BOOST` | `DELETE` | Never used |

**File: `constants/chartConstants.ts`**

| Export         | Action   | Rationale                                                                     |
| -------------- | -------- | ----------------------------------------------------------------------------- |
| `CHART_LAYOUT` | `REVIEW` | Re-exported but never imported. Check if charts inline similar layout values. |

---

## 16. Duplicate Exports (Code Smell)

| File                          | Issue                                                                                   | Action                                  |
| ----------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| `services/readingProgress.ts` | Exports both `ReadingProgressService` class and `readingProgressService` instance       | Keep instance only, remove class export |
| `services/studyStreak.ts`     | Exports both `StudySessionStreakService` class and `studySessionStreakService` instance | Keep instance only, remove class export |

---

## Summary

| Category            | Delete | Consider Use | Keep  | Review |
| ------------------- | ------ | ------------ | ----- | ------ |
| Functions/Constants | 15     | 7            | 2     | 5      |
| Types/Interfaces    | 8      | 0            | 1     | 1      |
| Enum Members        | 1      | 0            | 0     | 0      |
| **Total**           | **24** | **7**        | **3** | **6**  |

---

## Task Tracking

Use this section to track progress on cleanup:

### Phase 1: Quick Wins (DELETE items) - COMPLETED 2026-01-10

- [x] Remove `navigateBack`, `navigateReplace`, `validateAndNavigate` from navigationUtils.ts
- [x] Remove `calculateFontSize`, `createMeaningOverlayTextStyle`, `MEANING_OVERLAY_CONSTANTS` from textStyleUtils.ts
- [x] Remove `getUTCDateString`, `isSameDay` from chartDataUtils.ts (also removed from charts/index.ts re-exports)
- [x] Remove `mapToStudyWords` from typeMappers.ts
- [x] Remove `meetsMinimumLength` from arabicAnalysis/validationConstants.ts
- [x] Remove `androidRippleFeedback`, `androidPressFeedback` from haptics.ts
- [x] Remove `getSystemUIBackgroundColor` from useSystemUITheme.ts (also removed unused `ColorValue` import)
- [x] Remove `PRESS_ANIMATION_WORD` from usePressAnimation.ts (also removed from animations/index.ts re-exports)
- [x] Remove unused type exports:
  - `UseAccountScreenReturn` from hooks/account/useAccountScreen.ts
  - `ReadingProgressData` from hooks/articles/useReadingProgress.ts
  - `VocabularyStatsService` from services/vocabularyStats.ts
  - `DailyStudyActivity` from services/studyStreak.ts
  - `ThemeColorName` from types/ui/theme.types.ts
  - `ErrorMessageProps` from types/ui/review.types.ts
  - `StatCategory` from types/vocabulary.types.ts
  - `PriorityItem` from utils/priorityQueue.ts
- [x] Remove `DailyWordLimitStatus.APPROACHING` from enums.ts
- [x] Remove `OPACITY_BOOST` from layout.ts
- [x] Duplicate service exports - SKIPPED (both `ReadingProgressService` and `readingProgressService` are used in different files)

### Phase 2: Review Items - COMPLETED 2026-03-01

- [x] `generateFutureDateRange`/`generatePastDateRange` - removed (Phase 2)
- [x] `calculateSevenDayAverage` - removed (Phase 3): no chart consumers
- [x] `CHART_LAYOUT` - removed (Phase 3): no consumers outside re-export barrel
- [x] `useReadTabDataLoaded` - removed (Phase 3): no consumers; file deleted
- [x] `Route` type - removed (Phase 3): no consumers; codebase uses ROUTE_PATHS constants

### Phase 3: Consider Use Items - COMPLETED 2026-03-01

- [x] `navigateToArticle`/`navigateToStudyReview` - deleted entire navigationUtils.ts (Phase 2)
- [x] `HEADER_BUTTON_STYLE`/`HEADER_BUTTON_TEXT_STYLE` - deleted buttonStyleUtils.ts (Phase 2)
- [x] `createTranslationTextStyle` - removed (Phase 2)
- [x] `useCurrentTheme` - unexported (Phase 3): used internally by `useIsDarkMode` only
- [x] `useAndroidBackGesture` - deleted entire file (Phase 2)
- [x] `useAddBeginnerArticles` - deleted (Phase 3): no onboarding feature planned
- [x] `useAddCommonWords` - deleted (Phase 3): no onboarding feature planned

### Phase 3 Bonus: filtersSlice - COMPLETED 2026-03-01

- [x] `filtersSlice` - deleted (Phase 3): empty reducers, state never changed from initial values. Replaced Redux read in `useFilteredArticles.ts` with hardcoded constants.

### Phase 3 Knip Experiment Findings

New items surfaced by running `npx knip -c /tmp/knip-aggressive.json --exports --no-config-hints` with `ignoreExportsUsedInFile: true, includeEntryExports: true`:

| Item | File | Action | Notes |
|------|------|--------|-------|
| `DoneButton` | `components/ui/DoneButton.tsx:16` | `REVIEW` | Comment in NavigationHeaderButton says it "consolidates CloseButton and DoneButton" - may be superseded |
| `useTransformAnimation` | `hooks/animations/useTransformAnimation.ts:134` | `REVIEW` | Found in test mocks and barrel export only |
| `getAuthorFilterRoute` | `utils/routeBuilders.ts:34` | `REVIEW` | Only re-exported from constants/routes.ts, no real consumer |
| `getDifficultyFilterRoute` | `utils/routeBuilders.ts:42` | `REVIEW` | Same as above |
| `getLengthFilterRoute` | `utils/routeBuilders.ts:50` | `REVIEW` | Same as above |
| `getArticleMetadataWithoutAuthor` | `utils/stringUtils.ts:177` | `DELETE` | No consumers |
| `getArticleMetadataWithoutTime` | `utils/stringUtils.ts:196` | `DELETE` | No consumers |
| `ReviewParams` | `types/navigation.types.ts:4` | `DELETED` | Removed in Phase 3 (was only used by Route type) |
| `FiltersParams` | `types/navigation.types.ts:31` | `DELETED` | Removed in Phase 3 (was only used by Route type) |
| `ArticleParams` | `types/navigation.types.ts:38` | `DELETED` | Removed in Phase 3 (was only used by Route type) |
| `FontFamily` | `constants/fonts.ts:15` | `KEEP` | Used in tests |
| `STANDALONE_PRONOUNS` | `utils/arabicAnalysis/constants.ts:107` | `KEEP` | Used in tests |
| `COMPONENT_COUNT` | `utils/arabicAnalysis/validationConstants.ts:116` | `KEEP` | Used in tests |

---

## How to Resume This Task

1. Run validation to ensure codebase is clean: `yarn validate`
2. Pick items from Phase 1 (DELETE) - these are safe to remove
3. For each removal:
   - Search for the export name to confirm no usages
   - Remove the export
   - If file becomes empty/trivial, consider deleting entire file
4. After Phase 1, run `yarn validate` to ensure no regressions
5. Proceed to Phase 2 (REVIEW) items with manual investigation
6. Phase 3 (CONSIDER USE) items require product decisions
