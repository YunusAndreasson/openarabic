# Expo SDK 55 Ecosystem — Adoption Plan

## Current State

- `expo@55.0.4`, `react-native@0.83.2`, `react@19.2.0`
- `react-native-reanimated@4.2.1`, `react-native-worklets@0.7.2`
- `@shopify/flash-list@2.0.2`, `@gorhom/bottom-sheet@^5.2.8`
- `expo-image@^55.0.5`, `expo-glass-effect@^55.0.7`
- OTA updates via EAS Update (no bsdiff enabled yet)

## Priority 1: Enable Hermes Bytecode Diffing

**Effort**: Trivial | **Impact**: High

~75% smaller OTA updates via binary diffs instead of full Hermes bytecode bundles. Saves user bandwidth and EAS plan usage. Becomes the default in SDK 56.

**Implementation**:

- Add `"enableBsdiffPatchSupport": true` to `updates` config in `app.json`

**Files to modify**:

- `app.json` — add one field to existing `updates` block

```json
"updates": {
  "url": "https://u.expo.dev/644480e0-3ac0-4ce6-b6ca-b950f62ca438",
  "enableBsdiffPatchSupport": true
}
```

## Priority 2: Adopt `useEffectEvent` Hook

**Effort**: Medium (incremental) | **Impact**: Medium

React 19.2 hook that creates callbacks always reading fresh props/state without being effect dependencies. Eliminates `exhaustive-deps` lint suppressions.

**Why**:

- Cleaner effects throughout the codebase
- No more stale closure bugs from intentionally omitted dependencies
- Can be adopted file-by-file, no big-bang migration

**Pattern**:

```tsx
// Before: theme triggers unnecessary re-runs or requires lint suppression
useEffect(() => {
  analytics.track(articleId, theme);
}, [articleId, theme]);

// After: theme always fresh, effect only re-runs on articleId change
const onView = useEffectEvent(() => analytics.track(articleId, theme));
useEffect(() => {
  onView();
}, [articleId]);
```

**Implementation**:

- Identify effects with suppressed `exhaustive-deps` warnings
- Identify effects where some dependencies shouldn't trigger re-runs
- Refactor incrementally, starting with hooks that have the most impact
- Prioritize analytics callbacks, audio session effects, navigation effects

**Candidates to search for**:

- `// eslint-disable-next-line react-hooks/exhaustive-deps`
- Effects with callbacks that reference props/state but shouldn't re-trigger

## Priority 3: Adopt `<Activity>` Component for Tabs

**Effort**: Medium | **Impact**: Medium

React 19.2 component that preserves tab state without unmounting. Hidden tabs defer updates but keep component tree and state alive.

**Why**:

- Tab switches become instant (no re-mount, no re-fetch)
- Preserves scroll position, form state, and in-progress interactions
- Hidden tabs stop rendering updates (no wasted CPU)
- Works well with TanStack Query (cached data stays mounted)

**Implementation**:

- Wrap tab screen content with `<Activity mode={isActive ? 'visible' : 'hidden'}>`
- Test that hidden tabs correctly pause audio, animations, and subscriptions
- Verify memory usage doesn't spike with all tabs kept alive
- Test interaction with `freezeOnBlur` (may need to remove one or the other)

**Files to modify**:

- `app/(tabs)/_layout.tsx` — wrap tab screens with Activity
- Possibly individual tab screens if side effects need adjustment

**Open questions**:

- Does Activity interact correctly with NativeTabs on iOS?
- How does it affect the Practice tab's due-words badge updates?
- Does keeping Explore tab alive increase memory pressure from article data?

## Priority 4: Reanimated 4 CSS Animations

**Effort**: Medium (incremental) | **Impact**: Medium

Declarative CSS-like animation syntax available in Reanimated 4.x. Simplifies state-driven UI transitions.

**Why**:

- Simpler than imperative shared value + withTiming/withSpring approach
- CSS keyframes for multi-step animations
- CSS transitions for property changes
- Can coexist with existing shared value animations

**Candidates for migration**:

- `useOpacityAnimation` — fade in/out could become CSS transitions
- FAQ accordion animations in help screen
- Press animations (though `usePressAnimation` with springs may stay better)
- Any simple state-driven opacity/transform changes

**Pattern**:

```tsx
// Before: useOpacityAnimation hook with shared values
const { animatedStyle, fadeIn } = useOpacityAnimation();

// After: CSS transition (declarative, no hook needed)
const style = {
  transitionProperty: 'opacity',
  transitionDuration: '300ms',
  opacity: isVisible ? 1 : 0,
};
```

**Implementation**:

- Start with simple opacity transitions as proof of concept
- Compare performance and code clarity with existing approach
- If beneficial, expand to more animations incrementally
- Keep `usePressAnimation` (spring-based, better for interactive feedback)

**Files to evaluate**:

- `hooks/animations/useOpacityAnimation.ts` — candidate for CSS transitions
- `hooks/animations/useToggleAnimation.ts` — candidate for CSS transitions
- `app/(tabs)/explore/account/help.tsx` — FAQ fade animations
- `app/(tabs)/practice/index.tsx` — opacity animations

## Priority 5: Verify `expo-file-system` Imports

**Effort**: Low | **Impact**: Potentially breaking

SDK 55 changed default exports to the modern FileHandle-based API. Legacy API moved to `expo-file-system/legacy`.

**Action**:

- Check all imports from `expo-file-system` in the codebase
- Primary concern: `services/audioCache.ts` (uses file system for audio caching)
- If using legacy APIs (`FileSystem.readAsStringAsync`, `FileSystem.writeAsStringAsync`, `FileSystem.downloadAsync`), either:
  - Update import to `expo-file-system/legacy`, or
  - Migrate to new API (FileHandle, streams, TypedArray support)

**Files to check**:

- `services/audioCache.ts` — audio file caching
- Any other file importing from `expo-file-system`

## Cleanup Tasks

### Remove `estimatedItemSize` from FlashList (if present)

FlashList v2 measures precisely — `estimatedItemSize` is a no-op. Remove to reduce confusion.

**Files to check**:

- All FlashList usages (6 files)

### Remove `gestureHandlerRootHOC` (if used)

Deprecated in react-native-gesture-handler 2.29+.

**Action**: Search for `gestureHandlerRootHOC` and remove if found.

### Guard `expo-glass-effect` with Availability Check

Currently used in 2 files without checking `isLiquidGlassAvailable()`. Some iOS 26 beta versions may not have the API.

**Files to modify**:

- `components/article/FloatingActionButtons.tsx`
- `components/review/ReviewHeader.tsx`

## Lower Priority / Future Consideration

### `expo-image` SF Symbols Rendering

- Use `sf:` prefix in Image source for native SF Symbols
- Could replace some `@expo/vector-icons` usage on iOS
- Only relevant if pursuing the vector-icons migration (currently not recommended)

### `expo-image` Android Cookie Support

- Authenticated image requests now work on Android
- Relevant if Supabase storage images require auth cookies

### `@gorhom/bottom-sheet` Scrollable Creator Hook (5.2.0)

- Official API for integrating FlashList inside bottom sheets
- Evaluate if `WordDetailsBottomSheet` or other sheets need scrollable content

### Performance APIs (RN 0.83)

- `performance.now()`, `performance.mark()`, `performance.measure()` now stable
- Could instrument article loading, audio playback, and navigation timing
- Useful for identifying real-world performance bottlenecks

## Not Adopting

| Feature                          | Reason                           |
| -------------------------------- | -------------------------------- |
| expo-image HDR                   | No HDR content in the app        |
| Hermes V1 (experimental)         | Too early for production         |
| Background recording             | Recording disabled in app config |
| Web platform parity improvements | Mobile-only app                  |
| Intersection Observer (canary)   | Too experimental                 |
