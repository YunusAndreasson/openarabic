import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

import { FSRS_BASE_KEY } from '@/constants/fsrs';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

// Constants for better performance and maintainability
const CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE_V2';
const THROTTLE_TIME = 1000; // 1 second
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Pre-defined sets for faster lookups
const PERSIST_KEYS = new Set([
  'categories', // Static data - safe to persist
  'authors', // Static data - safe to persist
  // 'articles' and 'filtered-articles' excluded: too large for Android's 2MB CursorWindow limit
  // They are fetched fresh on app start anyway
  // 'readingList' - EXCLUDED: User-specific & auth-dependent, causes hydration errors
  // Note: 'reading-progress-bulk' is excluded (see EXCLUDED_KEYS) to prevent HMR hydration errors
]);
const VOCABULARY_KEYS = new Set([FSRS_BASE_KEY]);
const EXCLUDED_KEYS = new Set([
  'isInReadingList',
  'readingList', // User-specific & auth-dependent - causes hydration errors
  'enhancedAudioTracks',
  'reading-progress-bulk', // Explicitly exclude to prevent HMR hydration errors
]);
const EXCLUDED_PATTERNS = new Set(['due', 'live', 'cooldown']);

// Create the persister using AsyncStorage when available
export const queryPersister = createAsyncStoragePersister({
  storage: getSafeStorage(),
  key: CACHE_KEY,
  throttleTime: THROTTLE_TIME,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});


/**
 * Clears all persisted React Query cache from AsyncStorage
 * This removes both current and legacy cache keys to ensure complete cleanup
 * Used by the "Clear Cache" feature in Account settings
 */
export const clearPersistedQueryCache = async (): Promise<void> => {
  try {
    const storage = getSafeStorage();
    // Clear both old and new cache keys to ensure complete cleanup
    await storage?.removeItem?.('REACT_QUERY_OFFLINE_CACHE');
    await storage?.removeItem?.('REACT_QUERY_OFFLINE_CACHE_V2');
  } catch {
    // Ignore errors - this is best-effort cleanup
  }
};

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

  // Fast lookups for persistent keys
  if (PERSIST_KEYS.has(firstKey)) {
    return true;
  }

  // Handle vocabulary data
  // IMPORTANT: Only persist FSRS queries without user IDs or session-specific data
  // User-specific FSRS queries should be fetched fresh on each session
  if (VOCABULARY_KEYS.has(firstKey)) {
    // Check if this is a user-specific query (has userId in position 1)
    if (queryKey.length > 1 && typeof queryKey[1] === 'string' && queryKey[1].length > 10) {
      // Looks like a UUID/userId - don't persist user-specific queries
      return false;
    }
    return true;
  }

  // Default to not persisting
  return false;
};

// Configuration for cache persistence
export const PERSISTENCE_OPTIONS = {
  persister: queryPersister,
  maxAge: MAX_AGE,
  dehydrateOptions: {
    shouldDehydrateQuery,
  },
} as const;

// Clear legacy oversized cache that exceeds Android's CursorWindow limit
clearPersistedQueryCache();
