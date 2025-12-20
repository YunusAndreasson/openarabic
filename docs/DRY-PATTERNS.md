# DRY Patterns & Refactoring Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-20

This document catalogs the DRY (Don't Repeat Yourself) patterns established in the OpenArabic codebase. Use these patterns for new features to maintain consistency and reduce code duplication.

---

## Table of Contents

1. [Service Error Configuration](#service-error-configuration)
2. [Query Management](#query-management)
3. [OAuth Authentication](#oauth-authentication)
4. [UI Components](#ui-components)
5. [Utility Functions](#utility-functions)
6. [Migration Guide](#migration-guide)

---

## Service Error Configuration

### Pattern: Centralized Error Config Factory

**Location**: `utils/serviceErrorConfig.ts`

**Purpose**: Standardize error handling across all service files with consistent toast messages, analytics, and Sentry logging.

### Usage

```typescript
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';

const errorConfig = {
  load: createServiceErrorConfig('articles', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
    analyticsEventName: 'Articles_Load_Error', // Optional
  }),
  update: createServiceErrorConfig('article', 'update', {
    toastMessage: STRINGS.FAILED_TO_UPDATE_ARTICLE,
    showToast: false, // Optional - silent failure
  }),
};

// Use with executeQuery
const data = await executeQuery(() => supabase.from('articles').select('*'), {
  ...errorConfig.load,
  analyticsProperties: { filters: 'applied' }, // Optional context
});
```

### Benefits

- **Zero duplication**: Error configs defined once per operation
- **Automatic analytics**: Event names auto-generated from resource + operation
- **Type-safe**: Full TypeScript support with proper types
- **Consistent UX**: Standardized error messages and severity levels

### Refactored Services

- `bookmark.ts` - 4 operations
- `vocabularyStats.ts` - 5 operations
- `readingProgress.ts` - 7 operations
- `articles.ts` - 5 operations
- `studyStreak.ts` - 1 operation
- `studyWordsFSRS.ts` - 9 operations
- `categories.ts` - 1 operation
- `authors.ts` - 2 operations
- `audioPlaylist.ts` - 2 operations

**Lines eliminated**: ~120 lines of inline error configs

---

## Query Management

### Pattern: Centralized queryOptions with TanStack Query v5

**Location**: `constants/queries.ts`

**Purpose**: Single source of truth for all React Query configurations with co-located keys and options.

### Usage

```typescript
import { fsrsQueries, articleQueries } from '@/constants/queries';

// Use in components/hooks
const { data, isLoading } = useQuery(fsrsQueries.all(userId));
const { data: article } = useQuery(articleQueries.detail(articleId));

// Invalidate after mutations
await fsrsQueries.invalidateAll(queryClient, userId);
```

### Available Query Factories

#### FSRS Queries

- `fsrsQueries.all(userId)` - All FSRS words for a user
- `fsrsQueries.allWithCooldown(userId, hours)` - With session cooldown filter
- `fsrsQueries.due(userId, cooldown?)` - Only due words
- `fsrsQueries.stats(userId)` - Statistics data
- `fsrsQueries.invalidateAll(queryClient, userId)` - Bulk invalidation

#### Article Queries

- `articleQueries.all()` - All articles (infinite stale time)
- `articleQueries.detail(articleId)` - Single article
- `articleQueries.withStats()` - Articles with word statistics
- `articleQueries.categories()` - All categories (static)
- `articleQueries.authors()` - All authors (static)

#### Reading Progress Queries

- `readingProgressQueries.readingList(userId)` - User's bookmarks
- `readingProgressQueries.bulk(userId)` - Bulk progress data

#### Audio Queries

- `audioQueries.tracks(userId, audioPreference)` - Enhanced audio tracks

#### Study Streak Queries

- `studyStreakQueries.streak(userId)` - Current streak metrics
- `studyStreakQueries.history(userId, days)` - Historical data

### Cache Configuration

```typescript
// Static content (never changes)
CACHE_TIMES.ARTICLES: { staleTime: Infinity, gcTime: 24h }

// Frequently updated (due words, stats)
CACHE_TIMES.CRITICAL: { staleTime: 30s, gcTime: 2m }

// User data (moderate updates)
CACHE_TIMES.MEDIUM: { staleTime: 3m, gcTime: 10m }
```

### Benefits

- **Type-safe**: Full IntelliSense support
- **Zero duplication**: Keys and options defined once
- **Simplified invalidation**: Bulk invalidation helpers (75% less code)
- **Official pattern**: TanStack Query v5 recommended approach

---

## OAuth Authentication

### Pattern: OAuth Provider Factory

**Location**: `hooks/auth/useOAuthProvider.ts`

**Purpose**: Single factory for all OAuth providers (Google, Apple, future providers).

### Usage

```typescript
import { useOAuthProvider, type OAuthProviderConfig } from '@/hooks/auth/useOAuthProvider';

const config: OAuthProviderConfig = {
  provider: 'google',
  loadModule: async () => import('@react-native-google-signin/google-signin'),
  executeSignIn: async module => {
    // Provider-specific sign-in logic
    const result = await module.signIn();
    return {
      idToken: result.idToken!,
      user: result.user,
    };
  },
  handleProviderError: error => {
    // Optional custom error handling
    if (isUserCancelled(error)) return 'User cancelled sign-in';
    return undefined;
  },
};

export function useGoogleAuth() {
  return useOAuthProvider(config);
}
```

### Included Functionality

- ✅ Module loading with error handling
- ✅ Sentry breadcrumbs for debugging
- ✅ Supabase token exchange
- ✅ Session waiting and validation
- ✅ Analytics tracking
- ✅ Success handling (haptics + navigation)
- ✅ Comprehensive error messages
- ✅ Mount safety guards

### Benefits

- **831 lines eliminated**: Consolidated Google + Apple auth
- **Consistent UX**: Same flow for all providers
- **Easier maintenance**: Fix once, applies to all providers
- **Future-proof**: Add new providers with minimal code

---

## UI Components

### Pattern: Generic Reusable Components

**Purpose**: Extract common UI patterns into generic, configurable components.

### EmptyState Component

**Location**: `components/common/EmptyState.tsx`

```typescript
<EmptyState
  icon="albums-outline"
  title={STRINGS.BOOKMARKS_EMPTY_TITLE}
  hint={STRINGS.BOOKMARKS_EMPTY_HINT}
  iconSize={80} // Optional
/>
```

**Replaces**: Custom empty state implementations
**Lines saved**: ~94 lines across 2 components

### MetricCard Component

**Location**: `components/common/MetricCard.tsx`

```typescript
<MetricCard
  icon="flame"
  value={streak.currentStreak}
  label="Day Streak"
  color={Colors.light.tint}
  onPress={() => showDetails()}
/>
```

**Replaces**: Duplicate stat card implementations
**Lines saved**: ~142 lines across 2 components

### useButtonPress Hook

**Location**: `hooks/ui/useButtonPress.ts`

```typescript
const { handlePress, animatedStyle } = useButtonPress({
  onPress: handleSave,
  hapticType: 'selection',
  debounce: true,
  animationOptions: { scale: 0.95 },
});

<Animated.View style={animatedStyle}>
  <Pressable onPress={handlePress}>Save</Pressable>
</Animated.View>
```

**Handles**: Press handling, haptics, debouncing, animations
**Lines saved**: ~65 lines across 5 button components

### BottomSheetStateHandler

**Location**: `components/common/BottomSheetStateHandler.tsx`

```typescript
<BottomSheetStateHandler
  isLoading={isLoading}
  isError={isError}
  isEmpty={!data?.length}
  loadingMessage="Loading stats..."
  errorMessage="Failed to load"
  emptyState={<EmptyState icon="stats" title="No data yet" />}
>
  {data && <StatsContent data={data} />}
</BottomSheetStateHandler>
```

**Handles**: Loading, error, and empty states for bottom sheets
**Lines saved**: ~52 lines from StudyStreakBottomSheet

### AuthFormInputs

**Location**: `components/auth/AuthFormInputs.tsx`

```typescript
<AuthEmailInput
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  disabled={isLoading}
/>

<AuthPasswordInput
  value={password}
  onChangeText={setPassword}
  error={errors.password}
  disabled={isLoading}
  showForgotPassword={true}
/>
```

**Replaces**: Duplicate form inputs in SignIn/SignUp
**Lines saved**: ~79 lines across 2 forms

---

## Utility Functions

### FSRS Initializers

**Location**: `utils/fsrsInitializers.ts`

```typescript
import { createInitialFSRSEntry, createBulkFSRSEntries } from '@/utils/fsrsInitializers';

// Single entry
const entry = createInitialFSRSEntry(userId, rootId);
await supabase.from('study_words').insert(entry);

// Bulk entries
const entries = createBulkFSRSEntries(userId, rootIds);
await supabase.from('study_words').insert(entries);
```

**Purpose**: Centralize FSRS card initialization logic
**Lines saved**: ~37 lines from studyWordsFSRS.ts

### Sorting Utilities

**Location**: `utils/sortingUtils.ts`

```typescript
import { sortByCustomOrder, sortByDateDesc } from '@/utils/sortingUtils';

// Sort with custom order + fallback
const sorted = sortByCustomOrder(
  items,
  customOrder,
  item => item.id,
  (a, b) => sortByDateDesc(a.date, b.date),
);
```

**Purpose**: Reusable sorting patterns
**Lines saved**: ~32 lines from useBookmarksScreen

### Date/Time Utilities

**Location**: `utils/dateTimeUtils.ts`

```typescript
import { toUTCDateString, generatePastDateRange } from '@/utils/dateTimeUtils';

// Normalize to UTC date string
const dateStr = toUTCDateString(new Date()); // "2025-01-20"

// Generate date ranges
const last30Days = generatePastDateRange(30);
```

**Purpose**: Consistent date handling and UTC normalization
**Lines saved**: ~20 lines from studyStreak.ts

### String Validation

**Location**: `utils/stringUtils.ts`

```typescript
import { isNonEmptyString } from '@/utils/stringUtils';

// Safe string validation
if (isNonEmptyString(value)) {
  // value is definitely a non-empty string
}
```

**Purpose**: Consistent string validation across codebase

---

## Migration Guide

### When to Create a New Pattern

Create a new DRY pattern when:

1. **You see it 3+ times**: Same code in 3 or more places
2. **It's complex enough**: Pattern has 10+ lines of meaningful logic
3. **It's stable**: Logic unlikely to diverge between use cases
4. **It provides value**: Reduces cognitive load or improves maintainability

### When NOT to Extract

Don't extract if:

1. **It's trivial**: 1-2 lines of simple code
2. **It's diverging**: Each instance has different requirements
3. **It adds complexity**: Abstraction makes code harder to understand
4. **It's single-use**: Only needed in one place

### Refactoring Checklist

When refactoring to use a DRY pattern:

- [ ] Read the pattern documentation
- [ ] Understand the existing code fully
- [ ] Preserve all functionality exactly
- [ ] Keep all comments and documentation
- [ ] Maintain error handling
- [ ] Run tests before and after
- [ ] Verify TypeScript types are correct
- [ ] Update imports and remove unused dependencies

### Example: Migrating to Error Config Factory

**Before:**

```typescript
const data = await executeQuery(() => supabase.from('articles').select('*'), {
  toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
  analyticsEventName: 'Articles_Load_Error',
  sentrySeverity: 'error',
  showToast: true,
  captureSentry: true,
});
```

**After:**

```typescript
const errorConfig = {
  load: createServiceErrorConfig('articles', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ARTICLES,
  }),
};

const data = await executeQuery(() => supabase.from('articles').select('*'), errorConfig.load);
```

**Benefits**: 5 lines → 1 line at call site, config reusable across file

---

## Statistics

### Overall Impact

- **Total lines eliminated**: ~1,400 lines
- **Percentage reduction**: ~12-15% of mobile app codebase
- **Files improved**: 30+ files refactored
- **Patterns established**: 11 major patterns

### Per-Phase Breakdown

| Phase     | Focus                  | Lines Saved              |
| --------- | ---------------------- | ------------------------ |
| Phase 1   | OAuth Factory          | 831                      |
| Phase 2   | Service/Query Patterns | 150                      |
| Phase 3   | Mutation Helpers       | (Created for future use) |
| Phase 4   | UI Components          | 423                      |
| Phase 5   | Utilities              | 28                       |
| **Total** |                        | **~1,432**               |

### Quality Metrics

- ✅ Zero TypeScript errors
- ✅ All tests passing
- ✅ Consistent code style
- ✅ Full type safety maintained
- ✅ No functionality regressions

---

## Best Practices

### 1. Always Import from Constants

```typescript
// ✅ GOOD - Use centralized constants
import { STRINGS } from '@/constants/strings';
import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';

// ❌ BAD - Hardcoded values
const title = 'Failed to load articles';
const errorColor = '#ff0000';
```

### 2. Use Type-Safe Query Keys

```typescript
// ✅ GOOD - Use queryOptions
const { data } = useQuery(fsrsQueries.all(userId));

// ❌ BAD - Manual query config
const { data } = useQuery({
  queryKey: ['fsrs-words', userId],
  queryFn: () => studyWordsFSRSService.getFSRSWords(userId),
  // ... duplicate config
});
```

### 3. Prefer Generic Components

```typescript
// ✅ GOOD - Reusable component
<EmptyState icon="save" title="No bookmarks" hint="Add articles to read later" />

// ❌ BAD - Custom empty state
<View style={styles.empty}>
  <Icon name="save" size={80} />
  <Text style={styles.title}>No bookmarks</Text>
  <Text style={styles.hint}>Add articles to read later</Text>
</View>
```

### 4. Consistent Error Handling

```typescript
// ✅ GOOD - Centralized error config
const errorConfig = {
  load: createServiceErrorConfig('resource', 'load', {
    toastMessage: STRINGS.ERROR_MESSAGE,
  }),
};

// ❌ BAD - Inline error handling
try {
  const data = await api.load();
} catch (error) {
  showToast('Failed to load');
  analytics.track('Load_Error');
  Sentry.captureException(error);
}
```

---

## Future Patterns

### Candidates for Future DRY Extraction

1. **Form Validation**: Common validation logic across forms
2. **Image Handling**: Image loading, caching, and error states
3. **List Filtering**: Common filter/search patterns
4. **Animation Presets**: Reusable animation configurations
5. **Test Utilities**: Shared test helpers and mocks

### Contributing New Patterns

When adding a new DRY pattern:

1. Document it in this file
2. Add usage examples
3. List files that use the pattern
4. Include migration guide if applicable
5. Update statistics section

---

## Resources

- **TanStack Query Docs**: https://tanstack.com/query/latest
- **React Native Best Practices**: https://reactnative.dev/docs/performance
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**Maintained by**: OpenArabic Development Team
**Questions?**: See `CLAUDE.md` for development guidelines
