# OpenArabic - Claude Code Development Guide

**Version**: `1447.4.19+151` (Islamic Calendar Versioning)

This guide provides comprehensive development rules and patterns for Claude Code when working with the OpenArabic React Native app - a sophisticated Arabic language learning platform with spaced repetition, audio features, and intelligent article filtering.

## Core Principles

### Investigation-First Development

- **ALWAYS** search for existing implementations before creating new code
- Check for related components, hooks, or utilities
- Review relevant tests to understand expected behavior
- Look for established patterns in the same domain
- Verify TypeScript types and interfaces are already defined

### Simplicity & Reliability

- Strive to reduce complexity while maintaining reliability
- Focus on understanding root causes, not implementing workarounds
- Reuse existing functionality before creating new functions
- Place business logic in hooks, not components
- Remove obsolete code when introducing new features

### Command Execution Workflow

When running validation or test commands:

- **CRITICAL: NEVER run validation during development** - Make all changes first, then validate once at the very end
- **Run at the end only** - Only run `yarn validate` once when ALL work is complete and user confirms
- **Execute directly** - Run commands without asking permission or explaining what you're about to do
- **Be efficient** - Run `yarn validate` once, not individual steps (tsc, eslint, knip separately)
- **Show only errors** - If a command fails, show the error output and fix it
- **Verify once** - Re-run only to confirm the fix worked
- **No verbose explanations** - Don't explain what commands do or why you're running them

**Anti-pattern - DO NOT DO THIS:**

```
❌ Make edit → run tsc → run eslint → make another edit → run tsc again → run eslint again
```

**Correct pattern:**

```
✅ Make edit 1 → Make edit 2 → Make edit 3 → (user confirms done) → yarn validate once
```

**Examples of approved commands** (run these directly):

- `yarn validate` - Full validation suite (typecheck + lint + unused exports) - **RUN ONLY ONCE AT END**
- `yarn validate:full` - Comprehensive validation (all files, no optimization)
- `npx tsc --noEmit` - TypeScript type checking (only if uncertain about types)
- `yarn prettier:fix` - **AUTOMATIC FORMATTING FIX** - Always use this when prettier check fails (never manually fix formatting)
- `yarn lint:fix` or `npx eslint` - Linting with auto-fix (only at end)
- `yarn test` - Run tests (only when testing features)
- `yarn check-unused` - Check for unused exports (only at end)

**Performance Note:**

The validation workflow has been optimized for AI agent efficiency:

- `yarn validate` uses smart script (`scripts/validate-changed.js`) that checks only changed files
- **TypeScript**: Only changed .ts/.tsx files (via tsc-files) - ~0.4s
- **Prettier/ESLint**: All files with aggressive caching - ~3.4s and ~1.7s respectively
- **Parallel execution**: All three tools run simultaneously
- **80% faster**: Reduced from 28.29s → 5.66s for typical changes
- For comprehensive validation: Use `yarn validate:full` (all files, no optimization)

## Technical Stack

### Core Technologies

- **React Native**: 0.79.5 with React 19.0.0
- **Expo SDK**: 53 with New Architecture enabled
- **Navigation**: Expo Router v5.1.5 with typed routes and modal presentation
- **State Management**: Redux Toolkit v2.8.2 with Redux Persist
- **Data Fetching**: TanStack Query v5.85.5 (React Query) with persistence
- **UI Performance**: @shopify/flash-list v2.0.2 for optimized lists (New Architecture)
- **Animation**: react-native-reanimated v4.1.3 and @shopify/react-native-skia v2.0.0
- **Bottom Sheets**: @gorhom/bottom-sheet v5.2.6 for native bottom sheet modals
- **Audio**: expo-audio v0.4.9 for playback with ElevenLabs API
- **Spaced Repetition**: ts-fsrs v5.2.2 for vocabulary learning algorithms
- **Backend**: Supabase JS client v2.56.0 for database, storage, and auth
- **Testing**: Jest v29.7.0 with React Native Testing Library v13.3.2

## Essential Files & Constants (MANDATORY USAGE)

### Critical Constants Files

- **[database.types.ts](types/database.types.ts)** - All Supabase table types and database schemas
- **[Colors.ts](constants/Colors.ts)** - Complete theme system with light/dark modes, semantic colors, elevation system, opacity constants
- **[layout.ts](constants/layout.ts)** - Typography hierarchy, spacing scale, shadow system, touch targets, responsive utilities
- **[strings.ts](constants/strings.ts)** - All user-facing text, labels, messages, and localized content
- **[fsrs.ts](constants/fsrs.ts)** - Spaced repetition system constants, query keys, thresholds, algorithm parameters
- **[routes.ts](constants/routes.ts)** - Route path constants and helper functions for type-safe navigation
- **[animation.ts](constants/animation.ts)** - Timing configurations, spring presets, animation constants
- **[modal.ts](constants/modal.ts)** - Navigation options and modal presentation helpers
- **[arabicWordComponents.ts](constants/arabicWordComponents.ts)** - Comprehensive Arabic language rules for word analysis

### Required Usage Patterns

- **Typography**: Use `TYPOGRAPHY_HIERARCHY` and `LAYOUT.TYPOGRAPHY.SCALE` from layout.ts
- **Spacing**: Use `LAYOUT.SPACING` scale (TINY=4px, SMALL=8px, MEDIUM=12px, LARGE=16px, XLARGE=24px)
- **Elevation**: Use `LAYOUT.ELEVATION.SUBTLE/SMALL/MEDIUM/LARGE` constants for consistent elevation
- **Colors**: Use semantic color names from Colors.ts (avoid hardcoded hex values)
- **Strings**: Use `STRINGS.*` constants for all user-facing text (no hardcoded strings)
- **Animations**: Use `TIMING_CONFIG` and `SPRING_CONFIG` presets from animation.ts
- **Routes**: Use `ROUTE_PATHS` constants with `/(tabs)` prefix for navigation
- **FSRS keys**: Use `FSRS_QUERY_KEYS` for vocabulary-related query cache (keys start with `'fsrs-words'`)

## TypeScript & Code Quality (STRICT MODE)

### TypeScript Requirements

- **REQUIRED**: `strict: true` - All strict type checking options enabled
- **REQUIRED**: `noImplicitAny: true` - No implicit any types allowed
- **REQUIRED**: `strictNullChecks: true` - Handle null/undefined explicitly
- **REQUIRED**: `noImplicitReturns: true` - All code paths must return a value
- **REQUIRED**: `noUnusedLocals: true` - No unused local variables
- **REQUIRED**: `noUnusedParameters: true` - No unused function parameters
- **PATTERN**: Use optional chaining and nullish coalescing: `user?.profile?.name ?? 'Unknown'`

### Typing Patterns & Best Practices

#### Branded IDs (Type Safety for IDs)

Use branded types to prevent mixing different ID types:

```typescript
// ✅ GOOD - Type-safe IDs
import type { ArticleId, RootId } from '@/types/branded.types';

function getArticle(id: ArticleId): Article {
  /* ... */
}
function getRoot(id: RootId): Root {
  /* ... */
}

// ❌ CAUGHT AT COMPILE TIME
getArticle(rootId); // Error: RootId not assignable to ArticleId
```

**When to cast:** At boundaries where raw IDs enter from external sources:

```typescript
// Route params
const articleId = parseInt(params.id) as ArticleId;

// Service calls
articlesService.getArticleById(id as ArticleId);
```

#### Const Objects vs Enums

Prefer const objects over enums for string constants (zero runtime overhead):

```typescript
// ✅ GOOD - Const object (no runtime code)
export const ToastType = {
  ERROR: 'error',
  INFO: 'info',
  SUCCESS: 'success',
} as const;
export type ToastType = (typeof ToastType)[keyof typeof ToastType];

// ❌ AVOID - Enum (generates runtime code, larger bundle)
export enum ToastType {
  ERROR = 'error',
  INFO = 'info',
  SUCCESS = 'success',
}
```

**When to use enums:** Only for numeric enums or bitflags

#### Optional vs Nullable Properties

Be consistent with optionality patterns:

```typescript
// ✅ GOOD - Use ? for truly optional UI props
interface ComponentProps {
  title?: string; // May or may not be provided
  onClick?: () => void; // May or may not exist
}

// ✅ GOOD - Use | null for database fields that can be NULL
interface Article {
  fsrs_due: string | null; // Database can store NULL
  fsrs_stability: number | null; // Database can store NULL
}

// ❌ AVOID - Don't use | undefined explicitly
interface BadProps {
  title: string | undefined; // Just use title?: string
}
```

#### Avoiding `any` Types

Never use `any` in production code - always define proper types:

```typescript
// ❌ BAD - Defeats type safety
article.sentences?.forEach((sentence: any) => {
  (sentence as any).words.forEach((word: any) => {
    /* ... */
  });
});

// ✅ GOOD - Proper types
article.article_sentences?.forEach(sentence => {
  sentence.sentence_words?.forEach(word => {
    // word is properly typed as SentenceWord
  });
});
```

### ESLint Rules (Flat Config)

- **Import/Export**: Use `import type` for type-only imports: `import type { User } from './types'`
- **Variable Rules**: No unused variables (prefix with `_` if intentionally unused: `_unusedParam`)
- **React Rules**: Follow React Hooks rules strictly, always provide `key` prop for list items
- **Code Quality**: Use types from `/types` directory, never use `any` type

### Prettier Configuration

- **Semi-colons**: Always required
- **Quotes**: Single quotes for strings, double for JSX attributes
- **Trailing commas**: Always add for multi-line structures
- **Tab width**: 2 spaces
- **Print width**: 80 characters

**CRITICAL - Automatic Formatting:**

- **ALWAYS use `yarn prettier:fix`** when prettier check fails
- **NEVER manually fix formatting** - Prettier handles all formatting automatically
- This prevents wasting time trying to figure out formatting rules
- Command automatically formats all files correctly

## Performance Optimization

### Quick Optimization Patterns (1-5 minutes each)

#### 1. React.memo for Component Memoization

```tsx
// Wrap expensive components in React.memo
const ExpensiveComponent = React.memo(({ data }: { data: string[] }) => {
  return <ComplexChart data={data} />;
});
```

#### 2. Extract Static Constants

```tsx
// Move static styles outside component
const STATIC_STYLES = StyleSheet.create({
  container: {
    padding: LAYOUT.SPACING.MEDIUM,
    margin: LAYOUT.SPACING.SMALL,
  },
});

const MyComponent = () => <View style={STATIC_STYLES.container} />;
```

#### 3. useMemo for Expensive Calculations

```tsx
const processedData = useMemo(
  () => items.map(item => expensiveProcessing(item)).filter(Boolean),
  [items],
);
```

#### 4. useCallback for Event Handlers

```tsx
const handlePress = useCallback(() => {
  onPress();
}, [onPress]);
```

### Performance Targets

- **Render Time**: <50ms (16.67ms ideal for 60fps)
- **Re-render Count**: <10 for stable components
- **Lists**: Always use @shopify/flash-list, not FlatList

## Design System & UI Guidelines

### Color Theory & Palette

- **MANDATORY**: Use semantic colors from Colors.ts only
- **Primary palette**: `colors.tint` (sage green) for primary actions
- **Never use hardcoded hex values** - always reference theme colors
- **Green tint preference**: Avoid pure white, use subtle green tints for elevations

### Typography Hierarchy

- **MANDATORY**: Follow `TYPOGRAPHY_HIERARCHY` constants exactly
- **Arabic text**: Special handling with diacritics preservation
- **Scaling**: Use systematic progression (TINY → SMALL → MEDIUM → LARGE → HUGE)

### Spacing Grid System

- **MANDATORY**: Use `LAYOUT.SPACING` constants from layout.ts
- **Base unit**: 4pt system (TINY=4px, SMALL=8px, MEDIUM=12px, etc.)
- **No ad-hoc pixel values** - if you need a size, add it to the constants
- **Touch targets**: Minimum 48dp using `MIN_TOUCH_TARGET` constants

### Elevation System

- **MANDATORY**: Use `LAYOUT.SHADOW` constants from layout.ts
- **Levels**: SUBTLE → SMALL → MEDIUM → LARGE for progressive elevation
- **Consistency**: Reference BaseCard.tsx for proper elevation usage

### UX Laws (Apply to All UI Work)

- **Tesler's Law**: Shift complexity to system design, not users
- **Hick's Law**: Limit choices to reduce decision time
- **Fitts' Law**: Large touch targets (48dp minimum), position frequently-used controls nearby
- **Miller's Law**: Group information in 5-9 item chunks
- **Jakob's Law**: Leverage familiar mobile patterns
- **Norman's Law**: Design should clearly communicate possible actions

## Arabic Text Handling (CRITICAL)

### Single-Word Color-Coding Rule

- **CRITICAL**: Single English words should NEVER have grammar color-coding applied
- Color-coding is only educational when showing how multi-word phrases are constructed from Arabic components
- **Always check**: `text.trim().split(/\s+/).length === 1` before applying color analysis
- Single words should display in standard text color regardless of Arabic analysis results
- This prevents misleading educational cues and maintains clarity

## Bug Fixing Methodology

### Core Principles

- **CRITICAL**: Always fix the root cause, never implement workarounds or "fail safes" that mask issues
- Every fix must address why the problem occurred, not just its symptoms

### Investigation Process

1. **Root Cause Analysis**
   - Understand the problem completely - what's happening vs. what should happen
   - Trace the execution flow - follow code path from trigger to failure
   - Identify the exact failure point - where does the logic break down?
   - Question assumptions - what did we assume that's actually false?

2. **Code Investigation**
   - Read the relevant code - understand actual implementation
   - Check related components/hooks - verify data flow and dependencies
   - Review TypeScript types - ensure type safety and interfaces
   - Examine error handling - look for missing error cases
   - Never assume code behavior - verify with actual implementation

3. **Test Analysis**
   - Understand why existing tests aren't catching the bug
   - Check if tests are testing the right things
   - Verify test data matches real-world scenarios

### Implementation Requirements

- **Fix only what's broken** - don't refactor unrelated code
- **Use existing patterns** - follow established codebase conventions
- **Avoid overengineering** - simple solutions preferred over complex abstractions
- Follow existing linting rules and TypeScript strict mode

### Anti-Patterns to Avoid

- ❌ Workarounds: "Let's add a try-catch to handle this error"
- ❌ Fail safes: "We'll add validation to prevent this from happening again"
- ❌ Overengineering: "Let's refactor this entire system while we're here"
- ❌ Assumption-based fixes: "This should work based on the documentation"

## Feature Development Framework

### Phase 1: First Principles Foundation

Before any research, break down the feature request:

- **What is the actual user problem?** (Not the solution, but the underlying need)
- **Why does this problem exist?** (Root cause analysis)
- **What is the simplest possible solution?** (Minimum viable approach)
- **What assumptions are we making?** (Challenge every assumption)

### Phase 2: Codebase Research

- Search for similar patterns using semantic search
- Study existing components, hooks, utilities
- Analyze data structures in types/database.types.ts
- Examine current user flows and navigation patterns
- Review API patterns in services/

### Phase 3: Collaborative Discovery

Ask thoughtful questions:

- "Help me understand the fundamental user problem this solves..."
- "Looking at existing [similar feature], how should this be different?"
- "What specific user journey are you imagining from start to finish?"
- "From first principles, what is the user really trying to achieve?"

Suggest interesting possibilities based on research:

- "I found [existing pattern]. What if we extended it to also..."
- "Looking at the data available, we could potentially also offer..."
- "There's an opportunity to integrate with [existing feature] - would that be valuable?"

### Ready to Move Forward When:

- ✅ User goals and intent are crystal clear
- ✅ Fundamental user problem is well-understood
- ✅ Technical approach is agreed upon with clear trade-offs
- ✅ Edge cases and error scenarios are defined
- ✅ First principles validation confirms the approach

## Navigation Patterns

### Route Usage

- **CRITICAL**: Always use correct route paths with `/(tabs)` prefix: `/(tabs)/read/article/[id]` not `/article/[id]`
- Use Expo Router with modal presentation for overlays
- Modal screens hide tab headers completely
- Use `ROUTE_PATHS` constants from routes.ts
- Avoid navigation parameter bleed between screens

### Navigation Hierarchy

- Read → Account (renamed from Settings)
- Practice tab (renamed from Vocabulary) for spaced repetition
- Visual review screen lives at `ROUTE_PATHS.PRACTICE_REVIEW` (`/practice/review`)

## Data Management

### Database & API Patterns

- Structure Supabase queries in `services/` with typed responses
- Use database.types.ts for all database operations
- **CRITICAL**: Follow FSRS query key patterns for vocabulary data (keys starting with 'fsrs-words')
- Use consistent cache invalidation strategies
- Handle errors with `handleError()` utility from utils/errorHandling.ts

### Audio & Media

- Use expo-audio for all audio playback
- Handle background audio with proper session configuration
- Implement proper cleanup for audio resources
- Use enhanced audio service for playlist management

## State Management Guidelines

### When to Use Each Pattern

The app uses three complementary state management patterns. Choose the right tool based on your specific needs:

#### Redux Toolkit (Global App State)

**Use Redux when:**

- State needs to be accessed across multiple unrelated screens
- State requires persistence across app sessions
- State has complex update logic with multiple actions
- You need time-travel debugging capabilities

**Current Redux slices:**

- `themeSlice` - Theme preference (light/dark mode)
- `settingsSlice` - User preferences (audio language, fonts, shuffle)
- `editModeSlice` - Dictionary edit mode state
- `playlistSlice` - Audio playlist custom order
- `filterSlice` - Library filter selections

**Pattern:**

```typescript
// Define slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState: { audioLanguagePreference: 'arabic' },
  reducers: {
    setAudioLanguagePreference: (state, action) => {
      state.audioLanguagePreference = action.payload;
    },
  },
});

// Use in component
const dispatch = useAppDispatch();
const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);
dispatch(setAudioLanguagePreference('bilingual'));
```

#### React Context (Feature-Scoped State)

**Use Context when:**

- State is scoped to a specific feature or subtree
- State doesn't need persistence
- State changes infrequently
- You want to avoid prop drilling

**Current providers** (in `components/providers/`):

- `StreaksProvider` - Streak modal visibility (feature-scoped to reading streaks)
- `AuthProvider` - Authentication state
- `ToastProvider` - Toast notifications
- `FSRSDataProvider` - FSRS vocabulary data

**Pattern:**

```typescript
// Create context with provider
const FeatureContext = createContext<FeatureContextValue | null>(null);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  const value = useMemo(() => ({ state, setState }), [state]);

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

// Consume with custom hook
export function useFeature() {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeature must be used within FeatureProvider');
  }
  return context;
}
```

#### TanStack Query (Server State)

**Use React Query when:**

- Data comes from an API or database
- Data needs caching and background updates
- You need loading/error states automatically
- Data should be refetched on certain triggers

**Current query patterns:**

- `QUERY_KEYS.articles` - Article data (infinite staleTime, never changes)
- `QUERY_KEYS.fsrs` - FSRS vocabulary (medium staleTime, user-specific)
- `QUERY_KEYS.readingProgress` - Reading progress/streaks (short staleTime, frequently updated)
- `QUERY_KEYS.audio` - Audio playlists (depends on reading list)

**Pattern:**

```typescript
// Query with automatic caching
const { data, isLoading, error } = useQuery({
  queryKey: QUERY_KEYS.articles.detail(articleId),
  queryFn: () => articlesService.getArticleById(articleId),
  staleTime: CACHE_TIMES.ARTICLES.staleTime, // Infinity for static content
  enabled: !!articleId,
});

// Mutation with cache invalidation
const mutation = useMutation({
  mutationFn: newWord => studyWordsFSRSService.addWord(newWord),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fsrs.all(userId) });
  },
});
```

### Decision Tree

```
Does the data come from an API/database?
├─ YES → Use TanStack Query (React Query)
└─ NO → Is it global app state?
    ├─ YES → Does it need persistence?
    │   ├─ YES → Use Redux Toolkit
    │   └─ NO → Is it accessed across many screens?
    │       ├─ YES → Use Redux Toolkit
    │       └─ NO → Use React Context
    └─ NO → Is it component-local state?
        └─ Use useState/useReducer
```

### Best Practices

**DO:**

- ✅ Use `useAppSelector` with shallow equality for Redux (`useAppSelectorShallow`)
- ✅ Memoize Context values with `useMemo`
- ✅ Use `queryOptions` helper for type-safe React Query configurations
- ✅ Invalidate React Query caches after mutations
- ✅ Combine patterns when appropriate (e.g., Redux for preferences + React Query for data)

**DON'T:**

- ❌ Store server data in Redux (use React Query instead)
- ❌ Use Context for frequently changing values (causes re-renders of entire subtree)
- ❌ Mix state management patterns for the same piece of state
- ❌ Forget to provide Context at the root of the feature tree

### Bottom Sheet Patterns (@gorhom/bottom-sheet v5.2.6)

#### Core Principles

- **Dynamic Sizing** prevents content cutoff by automatically adjusting to content height
- **Maximum Height Limits** prevent sheets from exceeding screen height
- **FlashList Integration** requires special configuration to avoid performance issues

#### Sizing Strategy

**Use `enableDynamicSizing: true` when:**

- Content height varies dynamically (charts, variable-length lists, user-generated content)
- You want automatic height adjustment to prevent content cutoff
- Content is simple (no scrollable lists exceeding 50 items)

```typescript
// ✅ GOOD - Charts, streaks, dynamic content
import { COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';

<BottomSheetModal {...COMMON_BOTTOM_SHEET_MODAL_PROPS}>
  <BottomSheetView>
    <Chart data={dynamicData} /> {/* Auto-fits to chart height */}
  </BottomSheetView>
</BottomSheetModal>
```

**Use `enableDynamicSizing: false` + `snapPoints` when:**

- Content has known, fixed height (pickers with specific option counts)
- You need precise control over sheet positions
- You want multiple snap positions for user interaction

```typescript
// ✅ GOOD - Pickers with known heights
const SNAP_POINTS = [320]; // Fixed height for 4 options

<BottomSheet
  snapPoints={SNAP_POINTS}
  enableDynamicSizing={false}
  {...otherProps}
>
  <BottomSheetView>{/* Fixed height content */}</BottomSheetView>
</BottomSheet>
```

#### Critical Configuration

**Always wrap content in BottomSheetView:**

```typescript
// ✅ GOOD - Proper wrapper
<BottomSheetModal {...COMMON_BOTTOM_SHEET_MODAL_PROPS}>
  <BottomSheetView style={styles.container}>
    {content}
  </BottomSheetView>
</BottomSheetModal>

// ❌ BAD - Missing wrapper
<BottomSheetModal {...COMMON_BOTTOM_SHEET_MODAL_PROPS}>
  {content}
</BottomSheetModal>
```

**Use maxDynamicContentSize to prevent over-tall sheets:**

```typescript
// Automatically included in COMMON_BOTTOM_SHEET_MODAL_PROPS
export const COMMON_BOTTOM_SHEET_MODAL_PROPS = {
  enableDynamicSizing: true,
  maxDynamicContentSize: SCREEN_HEIGHT * 0.85, // 85% of screen max
  // ...other props
} as const;
```

#### FlashList Integration (Advanced)

**CRITICAL**: Never use `BottomSheetFlashList` with `enableDynamicSizing: true`

- Causes "Maximum call stack size exceeded" errors with 100+ items
- FlashList requires `enableDynamicSizing: false` with explicit `snapPoints`
- FlashList v2 automatically handles item sizing - no `estimatedItemSize` needed (deprecated in v2)

```typescript
// ✅ GOOD - FlashList configuration
import { BottomSheetFlashList } from '@gorhom/bottom-sheet';

<BottomSheetModal
  snapPoints={[SCREEN_HEIGHT * 0.9]}
  enableDynamicSizing={false} // REQUIRED with lists
>
  <BottomSheetFlashList
    data={items}
    renderItem={renderItem}
    // Note: estimatedItemSize deprecated in v2 - automatic layout handling
  />
</BottomSheetModal>
```

#### Common Utilities

Use shared utilities from `utils/bottomSheetUtils.tsx`:

- `COMMON_BOTTOM_SHEET_PROPS` - For regular BottomSheet with snapPoints
- `COMMON_BOTTOM_SHEET_MODAL_PROPS` - For BottomSheetModal with dynamic sizing
- `useBottomSheetBackdrop(onClose)` - Consistent backdrop behavior

## Testing & Validation

### Development Workflow

During development:

- Focus on specific tests related to your changes
- Test only what's necessary to validate fixes
- Use Jest with React Native Testing Library
- Test timeout: 10 seconds for async operations

### End of Session (REQUIRED)

Always run these commands before completing longer sessions:

1. `yarn validate` - Fast validation (only changed files, 5-6s)
2. `yarn validate:full` - Full validation (all files, use before commits/PRs)
3. Only run validation at the very end

### Test Commands

- `yarn test` - Run tests on changed files (~2.2s with --onlyChanged)
- `yarn test:all` - Run all tests (~7.7s)
- `yarn test:watch` - Watch mode for development
- `yarn test:coverage` - Generate coverage report
- `yarn validate` - Fast validation (changed files only, TypeScript + Prettier + ESLint)
- `yarn validate:full` - Full validation (all files, TypeScript + Prettier + ESLint + Knip)

## Important Implementation Notes

### Analytics Service

- **STATUS**: Analytics service is production-ready and functional
- Uses Mixpanel with graceful fallback when token is not configured
- Silent operation mode (no console logging in production)
- Lazy initialization on first analytics call
- Core events tracked: Sign In, Sign Up, Sign Out, Practice Session Complete
- Add new analytics events to `ANALYTICS_EVENTS` in constants/analytics.ts

### Haptic Feedback

- **IMPORTANT**: Avoid double haptic feedback from multiple components
- Use appropriate feedback types: `selectionFeedback` for most interactions
- Import from `utils/haptics.ts`
- Check if parent/child components both trigger haptics

### Memory Management

- Clean up audio resources on component unmount
- Use proper query invalidation for FSRS vocabulary data
- Clear persisted cache when needed via utility functions

## Directory Structure

```
app/
├── (tabs)/                     # Main tab navigation
│   ├── listen/                 # Audio playback tab
│   ├── practice/               # Vocabulary practice tab with dictionary
│   └── read/                   # Reading tab with articles and account
│       ├── account/            # Settings, fonts, themes, calendar
│       ├── article/[id].tsx    # Individual article reader
│       └── filter.tsx          # Article filtering
├── auth/                       # Authentication flow
└── study/review.tsx            # Standalone vocabulary review

hooks/                          # Custom React hooks for shared logic
components/                     # Reusable UI components
├── index.ts                    # Barrel export for root-level components
├── ThemedButton.tsx            # Themed components at root
├── ThemedInput.tsx
├── ThemedText.tsx
├── ThemedView.tsx
├── EnhancedImage.tsx           # UI utilities at root
├── HeaderProfile.tsx
├── ThemePicker.tsx
├── Toast.tsx
├── providers/                  # Context providers (AuthProvider, ToastProvider, etc.)
├── ui/                         # Shared UI components
├── audio/                      # Audio playback components
├── article/                    # Article-specific components
├── library/                    # Library/reading list components
├── study/                      # Vocabulary practice components
├── bookmarks/                  # Bookmarks/listening components
├── account/                    # Account/settings components
├── auth/                       # Authentication components
├── review/                     # Review screen components
└── common/                     # Common/shared components
constants/                      # App constants, theme values, configuration
services/                       # External API communication (Supabase)
store/                          # Redux state management with persistence
types/                          # TypeScript type definitions
utils/                          # Helper functions and utilities
__tests__/                      # Test files
__mocks__/                      # Mock implementations
```

## Copy & Messaging Guidelines

### General Principles

- Write in plain, user-centric language; avoid jargon
- Be concise: minimum text that conveys meaning
- Address the user directly ("you") or use imperative verbs
- Frame statements positively and solution-oriented; never blame the user
- Maintain consistent terminology and voice

### Microcopy (Buttons, Labels)

- Use strong action verbs + object (e.g., **Save changes**, **Upload file**)
- Avoid vague labels ("OK", "Click here"); be specific
- Keep button text 1-3 words
- Prefer sentence case

### System Messages

- State what happened and how to fix in ≤ 2 short sentences
- Use neutral language; do not blame or scold
- Offer an actionable next step when possible
- Reserve exclamation points for genuine success celebrations

## Constraints & Platform Specifics

- Mobile-only app (portrait orientation only)
- No tablet support (iOS supportsTablet: false)
- Focus on mobile UX patterns, not responsive web design
- Prefer simple implementations over complex engineering
- Maintain existing architecture patterns

## Version Management

Uses Islamic Calendar versioning:

- Format: `YEAR.MONTH.RELEASE` (e.g., `1447.2.2`)
- Build numbers maintained per platform in package.json (e.g., `1447.2.2+41`)

## Release & Deployment

### GitHub Actions Workflow Commands

You can trigger release builds directly using the GitHub CLI:

```bash
# Trigger iOS-only release build
gh workflow run release.yml -f platform=ios

# Trigger Android-only release build
gh workflow run release.yml -f platform=android

# Trigger both platforms (default)
gh workflow run release.yml -f platform=all

# Check workflow status
gh workflow view release.yml
```

**When to use these commands**:

- After fixing critical bugs that need immediate TestFlight deployment
- When testing environment variable changes in EAS builds
- To trigger manual releases outside of the automatic version bump workflow

**Important notes**:

- The workflow automatically handles version bumping, building, and TestFlight/Play Store submission
- Builds use `--clear-cache` flag to ensure fresh Metro bundles with updated environment variables
- All `EXPO_PUBLIC_*` variables are injected from GitHub Secrets during the build process

### EAS CLI Commands

You can run EAS commands directly using either `eas` or `npx eas-cli`:

```bash
# Build commands
eas build --platform ios --profile preview --clear-cache
eas build --platform android --profile production --clear-cache --non-interactive
eas build --platform all --profile development --clear-cache

# Update commands (OTA updates)
eas update --branch root --auto --clear-cache
eas update --branch development --message "Fix critical bug" --clear-cache

# List recent builds
eas build:list --platform ios --limit 5 --non-interactive
eas build:list --status in-progress

# Check authentication
eas whoami

# View project configuration
eas config
```

**Available build profiles** (from eas.json):

- `development` - Development builds with Expo Go
- `preview` - Internal testing builds (TestFlight/Internal Track)
- `production` - Production builds for App Store/Play Store

**Critical flags**:

- `--clear-cache` - **ALWAYS use this** when environment variables change or fixing cache-related issues
- `--non-interactive` - Required for CI/CD environments (GitHub Actions uses this)
- `--auto` - Auto-detect branch name and commit message for updates

**When to use EAS CLI directly**:

- Local testing of builds before pushing to CI/CD
- Quick OTA updates without full builds
- Debugging build issues with detailed logs
- Checking build status and history

## Success Criteria

A successful implementation meets these criteria:

- ✅ Zero TypeScript/ESLint errors
- ✅ All tests pass with coverage
- ✅ Performance optimizations applied
- ✅ Constants used (no hardcoded values)
- ✅ Proper error handling with handleError()
- ✅ Type safety maintained (no `any` types)
- ✅ Arabic text handling follows single-word rules
- ✅ Navigation uses correct `/(tabs)` prefixed routes
- ✅ Design system patterns followed (Colors.ts, layout.ts)

---

_This guide serves as the comprehensive reference for Claude Code when developing the OpenArabic Arabic language learning application. Always prioritize investigation-first development, strict type safety, and consistent use of the established design system._

- only run tests before i instruct you to commit to speed up development
