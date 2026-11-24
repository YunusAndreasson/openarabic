import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Mutation, Query, QueryClient } from '@tanstack/react-query';
import { persistQueryClientSave, type PersistedClient } from '@tanstack/react-query-persist-client';

import { PERSISTED_CACHE_MAX_AGE_MS } from '@/constants/queries';
import { STORAGE_KEYS } from '@/constants/storageKeys';

// Constants for better performance and maintainability
const CACHE_KEY = STORAGE_KEYS.QUERY_CACHE;
const LEGACY_CACHE_KEY = STORAGE_KEYS.QUERY_CACHE_LEGACY;
const THROTTLE_TIME = 1000; // 1 second

// Pre-defined sets for faster lookups
const PERSIST_KEYS = new Set([
  'categories', // Static data - safe to persist
  'authors', // Static data - safe to persist
  // 'articles' and 'filtered-articles' excluded: too large for Android's 2MB CursorWindow limit
  // They are fetched fresh on app start anyway
  // 'readingList' - EXCLUDED: User-specific & auth-dependent, causes hydration errors
  // Note: 'reading-progress-bulk' is excluded (see EXCLUDED_KEYS) to prevent HMR hydration errors
]);
// Checked before PERSIST_KEYS, so these stay out even if one is ever added there.
const EXCLUDED_KEYS = new Set([
  'readingList', // User-specific & auth-dependent - causes hydration errors
  'enhancedAudioTracks',
  'reading-progress-bulk', // Explicitly exclude to prevent HMR hydration errors
]);
const EXCLUDED_PATTERNS = new Set(['due', 'cooldown']);

// A lost response leaves these idempotent writes safe to repeat. TanStack
// resumes only paused snapshots, including when the app died mid-transfer.
function serializeClient(client: PersistedClient): string {
  const mutations = client.clientState.mutations.map(mutation =>
    mutation.meta?.persistPending
      ? { ...mutation, state: { ...mutation.state, isPaused: true, failureReason: null } }
      : mutation,
  );
  return JSON.stringify({ ...client, clientState: { ...client.clientState, mutations } });
}

// A throttled write may already be queued with the departing learner's mutations.
let epoch = 0;
function makePersister(throttleTime: number) {
  const generation = epoch;
  return createAsyncStoragePersister({
    storage: {
      getItem: key => AsyncStorage.getItem(key),
      removeItem: key => AsyncStorage.removeItem(key),
      setItem: (key, value) =>
        generation === epoch ? AsyncStorage.setItem(key, value) : Promise.resolve(),
    },
    key: CACHE_KEY,
    throttleTime,
    serialize: serializeClient,
    deserialize: JSON.parse,
  });
}
let throttled = makePersister(THROTTLE_TIME);
let immediatePersister = makePersister(0);
export const queryPersister: typeof throttled = {
  persistClient: client => throttled.persistClient(client),
  restoreClient: () => throttled.restoreClient(),
  removeClient: () => throttled.removeClient(),
};
export function invalidateQueryPersistence() {
  epoch++;
  throttled = makePersister(THROTTLE_TIME);
  immediatePersister = makePersister(0);
}

/**
 * Helper to check if query key contains any excluded patterns
 */
const hasExcludedPattern = (queryKey: readonly unknown[]): boolean => {
  return queryKey.some(key => typeof key === 'string' && EXCLUDED_PATTERNS.has(key));
};

// Optimized shouldDehydrateQuery function
const shouldDehydrateQuery = (query: Query): boolean => {
  const queryKey = query.queryKey;
  const firstKey = typeof queryKey[0] === 'string' ? queryKey[0] : '';

  // CRITICAL: Only persist queries with successful data
  // This prevents "dehydrated as pending ended up rejecting" errors on app restart
  // and ensures we don't persist queries with errors
  if (query.state.status !== 'success') {
    return false;
  }

  // Early exit for excluded patterns
  if (hasExcludedPattern(queryKey)) {
    return false;
  }

  // Fast exclusion checks
  if (EXCLUDED_KEYS.has(firstKey)) {
    return false;
  }

  // Fast lookups for persistent keys. Everything else — the user's FSRS words
  // included, which are fetched fresh each session — is not persisted.
  return PERSIST_KEYS.has(firstKey);
};

// Configuration for cache persistence
export const PERSISTENCE_OPTIONS = {
  persister: queryPersister,
  maxAge: PERSISTED_CACHE_MAX_AGE_MS,
  // Bump this string to invalidate the persisted cache instead of renaming the
  // storage key — persistQueryClient discards AND deletes a blob whose buster
  // doesn't match at restore (documented persistQueryClient behavior).
  buster: 'v2',
  dehydrateOptions: {
    shouldDehydrateQuery,
    shouldDehydrateMutation: (mutation: Mutation) =>
      mutation.state.isPaused ||
      (mutation.meta?.persistPending === true && mutation.state.status === 'pending'),
  },
} as const;

/**
 * Forces an immediate, unthrottled write of the query/mutation cache to
 * AsyncStorage. Call this at app-lifecycle checkpoints (backgrounding) where
 * the process may be killed with no further chance to flush — a paused
 * mutation (FSRS grade, saved word, etc.) otherwise only survives a kill if
 * `queryPersister`'s 1s throttle happened to have already fired.
 */
export const flushPersistedQueryCache = (queryClient: QueryClient): Promise<void> =>
  persistQueryClientSave({
    queryClient,
    persister: immediatePersister,
    buster: PERSISTENCE_OPTIONS.buster,
    dehydrateOptions: PERSISTENCE_OPTIONS.dehydrateOptions,
  });

// Fire-and-forget removal of the pre-V2 cache blob: the V2 persister only
// reads/writes CACHE_KEY, so it can never see (or reclaim) the legacy entry.
AsyncStorage.removeItem(LEGACY_CACHE_KEY).catch(() => {
  // Best-effort cleanup; a failure just leaves the orphaned legacy blob.
});
