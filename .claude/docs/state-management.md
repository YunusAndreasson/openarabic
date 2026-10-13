# State Management Guidelines

The app uses three complementary state management patterns. Choose the right tool based on your specific needs.

## Decision Tree

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

## Redux Toolkit (Global App State)

**Use Redux when:**

- State needs to be accessed across multiple unrelated screens
- State requires persistence across app sessions
- State has complex update logic with multiple actions
- You need time-travel debugging capabilities

**Current Redux slices:**

- `themeSlice` - Theme preference (light/dark mode)
- `settingsSlice` - User preferences (audio language, fonts, shuffle)
- `editModeSlice` - Temporary playlist edit mode (not persisted)
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

## React Context (Feature-Scoped State)

**Use Context when:**

- State is scoped to a specific feature or subtree
- State doesn't need persistence
- State changes infrequently
- You want to avoid prop drilling

**Current providers** (in `components/providers/`):

- `StreaksProvider` - Streak modal visibility
- `AuthProvider` - Authentication state
- `ToastProvider` - Toast notifications
- `FSRSDataProvider` - FSRS vocabulary data

**Pattern:**

```typescript
const FeatureContext = createContext<FeatureContextValue | null>(null);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const value = useMemo(() => ({ state, setState }), [state]);
  return <FeatureContext value={value}>{children}</FeatureContext>;
}

export function useFeature() {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeature must be used within FeatureProvider');
  }
  return context;
}
```

## TanStack Query (Server State)

**Use React Query when:**

- Data comes from an API or database
- Data needs caching and background updates
- You need loading/error states automatically
- Data should be refetched on certain triggers

**Current query patterns:**

- `QUERY_KEYS.articles` - Article data (infinite staleTime, never changes)
- `QUERY_KEYS.fsrs` - FSRS vocabulary (medium staleTime, user-specific)
- `QUERY_KEYS.readingProgress` - Reading progress/streaks (short staleTime)
- `QUERY_KEYS.audio` - Audio playlists (depends on reading list)

**Pattern:**

```typescript
// Query with automatic caching
const { data, isLoading, error } = useQuery({
  queryKey: QUERY_KEYS.articles.detail(articleId),
  queryFn: () => articlesService.getArticleById(articleId),
  staleTime: CACHE_TIMES.ARTICLES.staleTime,
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

## Best Practices

**DO:**

- ✅ Use `useAppSelectorShallow` for Redux to prevent unnecessary re-renders
- ✅ Memoize Context values with `useMemo`
- ✅ Use `queryOptions` helper for type-safe React Query configurations
- ✅ Invalidate React Query caches after mutations
- ✅ Combine patterns when appropriate (Redux for preferences + React Query for data)

**DON'T:**

- ❌ Store server data in Redux (use React Query instead)
- ❌ Use Context for frequently changing values (causes re-renders of entire subtree)
- ❌ Mix state management patterns for the same piece of state
- ❌ Forget to provide Context at the root of the feature tree
