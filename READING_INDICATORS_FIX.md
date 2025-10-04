# Reading Indicators Fix - Race Condition Resolution

## Problem

Reading indicator circles were not showing in the filtered article view on app startup, but would appear correctly after:
- Clearing cache
- Opening a single article
- Navigating away and returning to the filtered view

This was a regression that had occurred multiple times.

## Root Cause

**Race Condition** between data loading and component rendering:

### The Flow

1. `app/(tabs)/library/filter.tsx` fetches articles with `refetchOnMount: false` (uses cached data)
2. `FilteredArticleView` component renders and calls `useSafeBulkReadingProgress(articleIds)`
3. `useBulkReadingProgress` queries `['reading-progress-bulk', userId]` with `refetchOnMount: false`
4. **However**: The app preloader (`useAppPreloader.ts`) prefetches reading progress data **after** articles have loaded
5. **Result**: When FilteredArticleView first renders, `progressMap` is an empty `Map()` because the bulk progress query hasn't resolved yet

### Why Cache Clear/Article Open Worked

- **Cache clear**: Forces refetch of all data, ensuring proper load order
- **Article open**: `useReadingProgress` creates individual progress entries and invalidates the bulk query
- **Re-navigation**: Data is now cached from the previous successful load

## The Fix

### 1. Fixed Data Loading Race Condition (`hooks/app/useAppPreloader.ts:66-83`)

**Before:**
```typescript
const [_categories, _articles] = await Promise.all(criticalPromises);
setPreloadProgress(25);

// Reading progress loaded AFTER articles
if (user?.id) {
  await queryClient.prefetchQuery({
    queryKey: ['reading-progress-bulk', user.id],
    queryFn: () => readingProgressService.getBulkProgress(user.id, []),
    // ...
  });
}
```

**After:**
```typescript
// CRITICAL FIX: Load reading progress synchronously with articles
const readingProgressPromise = user?.id
  ? queryClient.prefetchQuery({
      queryKey: ['reading-progress-bulk', user.id],
      queryFn: () => readingProgressService.getBulkProgress(user.id, []),
      staleTime: 30000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
    })
  : Promise.resolve();

// Wait for BOTH articles AND reading progress to complete
const [_categories, _articles] = await Promise.all([
  ...criticalPromises,
  readingProgressPromise,
]);
setPreloadProgress(25);
```

**Key Change**: Reading progress now loads **in parallel** with articles, not after. Both must resolve before app marks data as loaded.

### 2. Added Loading State Safeguard (`components/library/FilteredArticleView.tsx:131,254-257`)

**Added:**
```typescript
const { data: progressMap, isLoading: isProgressLoading } = useSafeBulkReadingProgress(articleIds);

// Show loading state when:
// 1. Loading articles and no articles cached yet
// 2. Loading progress data on first render (prevents showing items without indicators)
const isInitialProgressLoad = isProgressLoading && visibleArticles.length > 0 && !progressMap?.size;
const shouldShowLoading =
  loading && (visibleArticles.length === 0 || (articles?.length && !shouldShowEmpty)) ||
  isInitialProgressLoad;
```

**Key Change**: Component now explicitly waits for progress data to load before rendering items, preventing the race condition UI issue.

## Testing

Manual testing should verify:
1. ✅ Reading indicators appear immediately on cold app start in filtered views
2. ✅ Indicators persist after navigation
3. ✅ No flicker or delayed indicator appearance
4. ✅ Cache clear still works correctly
5. ✅ Opening individual articles updates progress correctly

## Files Changed

- `hooks/app/useAppPreloader.ts` - Fixed loading order race condition
- `components/library/FilteredArticleView.tsx` - Added loading state safeguard

## Prevention

To prevent this regression in the future:
1. **Always load reading progress data synchronously with articles** in preloader
2. **Monitor query cache timing** - ensure dependent queries resolve before dependent components render
3. **Use explicit loading states** when data dependencies exist
4. **Test cold start scenarios** - clear cache and verify data loads correctly
