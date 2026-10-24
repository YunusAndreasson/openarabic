# State Management Guidelines

The app uses three complementary state management patterns, plus two small
module-level store helpers. Choose the right tool based on your specific needs.

## Decision Tree

```
Does the data come from an API/database?
├─ YES → Use TanStack Query (React Query)
└─ NO → Is it global app state?
    ├─ YES → Does it need persistence?
    │   ├─ YES → Is it a user preference or learned per-user data?
    │   │   ├─ YES → Use Redux Toolkit (persisted slice)
    │   │   └─ NO (bookkeeping: prompt impressions, ledgers) → createJsonStore
    │   └─ NO → Is it accessed across many screens?
    │       ├─ YES → Use Redux Toolkit, or a module-level createExternalStore
    │       └─ NO → Use React Context
    └─ NO → Is it component-local state?
        └─ Use useState/useReducer
```

## Redux Toolkit (Global App State)

**Use Redux when:**

- State needs to be accessed across multiple unrelated screens
- State requires persistence across app sessions
- State has complex update logic with multiple actions

**Current Redux slices** (`store/`, combined in `store/rootReducer.ts`):

- `themeSlice` - Theme preference (light/dark/sepia). Persisted.
- `settingsSlice` - User preferences (fonts, audio language, shuffle, reminders, voice, pacing). Persisted.
- `playlistSlice` - Audio playlist custom order. Persisted.
- `voiceAliasesSlice` - Transcripts the learner overruled the recognizer on, per root. Persisted.
- `editModeSlice` - Temporary playlist edit mode. Not persisted.

On an account switch (`accountSwitched`, dispatched by the auth provider) every
slice but the theme returns to its initial state.

**Read settings through the slice's selectors**, never the raw field. Each one
narrows a persisted value an older build may have left behind (an unknown
font, an out-of-range size, an unknown language) and owns its default:

```typescript
const font = useAppSelector(selectArabicFont); // not resolveArabicFont(state.settings.arabicFont)
const language = useAppSelectorShallow(selectAudioLanguage);
const theme = useCurrentTheme(); // selectTheme: a stored null reads as Dark
```

**Write with event reducers** that change only what the event is about, rather
than reading a whole object, spreading it and writing it back:

```typescript
dispatch(remindersToggled(true)); // not setReminderTime({ ...reminderTime, enabled: true })
dispatch(reminderClockSet({ hour, minute }));
```

### Persistence

`store/persistConfig.ts` holds the redux-persist config (in its own module so
`__tests__/store/persistConfig.test.ts` can run the real pipeline):

- **`autoMergeLevel2`**: each persisted slice merges onto its initial state, so
  a field added after a learner's install reads its shipped default. (The
  library default, `autoMergeLevel1`, handed the stored slice back verbatim and
  every new field read `undefined`; that shipped four times.)
- **Versioned migrations** (`PERSIST_VERSION` + `createMigrate`). A migration
  runs once, for stores whose `_persist.version` is below its key.

When you add a settings field, decide what EXISTING installs should read. If
the shipped default is right for them, there is nothing to do. If they must
keep today's behaviour (as with `voiceEnabled`, which they read as off), add a
migration: bump `PERSIST_VERSION`, add the next key, and make it total — a
migration that throws makes redux-persist rehydrate an empty store, and the
next write replaces the learner's stored settings with defaults.

## React Context (Feature-Scoped State)

**Use Context when:**

- State is scoped to a specific feature or subtree
- State doesn't need persistence
- State changes infrequently
- You want to avoid prop drilling

**Current providers** (in `components/providers/` unless noted):

- `AuthProvider` - Authentication state (`useAuth`)
- `ToastProvider` - Toast notifications (`useToast`); also the target of
  global toasts from `handleError` / `showSuccessToast`. Providers nest (the
  article reader mounts its own), and unmounting one hands global toasts back
  to the provider below it.
- `TutorialProvider` - Tutorial completion state (`useTutorialContext`)
- `FSRSDataProvider` - FSRS vocabulary data (`useFSRSData`)
- `VoiceGradingProvider` - Voice answers: recognizer, session and capture (`useVoiceGrading`)
- `GlobalAudioStateProvider` (`hooks/audio/useGlobalAudioState`) - Article audio playback state

**Pattern:** `createRequiredContext` makes the context and the hook that reads
it, and throws your message when the provider is missing. Render the context
itself as the provider (`<Context value>`).

```typescript
const [FeatureContext, useFeature] = createRequiredContext<FeatureContextValue>(
  'FeatureContext',
  'useFeature must be used within FeatureProvider',
);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  return <FeatureContext value={{ state, setState }}>{children}</FeatureContext>;
}
```

The React Compiler memoizes the value; existing manual `useMemo`s stay.

## TanStack Query (Server State)

**Use React Query when:**

- Data comes from an API or database
- Data needs caching and background updates
- You need loading/error states automatically
- Data should be refetched on certain triggers

**Query factories** live in `constants/queries.ts`, one per domain
(`fsrsQueries`, `articleQueries`, `readingProgressQueries`, `audioQueries`,
`studyStreakQueries`, `sentenceQueries`, `rootEnrichmentQueries`). Each entry
is a `queryOptions(...)` with its key co-located, and each domain has an
`invalidateAll` helper. Never hand-write a key a factory owns.

**Pattern:**

```typescript
// User-scoped query: gated() swaps the queryFn for skipToken while there is no user
const { data: words } = useQuery(gated(fsrsQueries.all, userId));

// Anything else takes the factory's options as they are
const { data: article } = useQuery(articleQueries.detail(articleId));

// Mutation with cache invalidation through the domain helper
const mutation = useMutation({
  mutationFn: (rootIds: RootId[]) => studyWordsFSRSService.addMultipleRoots(userId, rootIds),
  onSuccess: () => fsrsQueries.invalidateAll(queryClient, userId),
});
```

## Module-level stores

- **`createExternalStore`** (`utils/createExternalStore`): a value React
  subscribes to with `useSyncExternalStore` — Skia GPU and font availability,
  onboarding progress. `onFirstSubscribe` / `onLastUnsubscribe` attach an OS
  listener only while something reads it.
- **`createJsonStore`** (`utils/createJsonStore`): a typed JSON value under one
  AsyncStorage key, with its decoder, fail-safe values and reporting — the
  notification prompt, the reminder mirror, the recall window, the study-day
  ledger, onboarding progress. Every key is declared in
  `constants/storageKeys.ts` with its scope. A store with `cache: true` must be
  `reset()` whenever something else removes its key (an account switch does,
  for `account`-scoped keys).

## Best Practices

**DO:**

- ✅ Read settings through the slice selectors
- ✅ Use `useAppSelectorShallow` when a selector builds an object
- ✅ Use the `queryOptions` factories and `gated()` for user-scoped queries
- ✅ Invalidate React Query caches after mutations
- ✅ Combine patterns when appropriate (Redux for preferences + React Query for data)

**DON'T:**

- ❌ Store server data in Redux (use React Query instead)
- ❌ Read `state.settings.x` directly (a stale or missing value skips its default)
- ❌ Use Context for frequently changing values (causes re-renders of entire subtree)
- ❌ Mix state management patterns for the same piece of state
- ❌ Forget to provide Context at the root of the feature tree
