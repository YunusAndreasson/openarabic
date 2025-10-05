import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

import { FSRS_BASE_KEY, STRUGGLING_WORDS_KEY } from '@/constants/fsrs';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

// Constants for better performance and maintainability
const CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE';
const THROTTLE_TIME = 1000; // 1 second
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Pre-defined sets for faster lookups
const PERSIST_KEYS = new Set([
  'categories',
  'authors',
  'articles',
  'filtered-articles',
  'readingList',
  'reading-progress',
  'reading-progress-bulk',
]);
const VOCABULARY_KEYS = new Set([FSRS_BASE_KEY]);
const EXCLUDED_KEYS = new Set(['isInReadingList', 'enhancedAudioTracks', STRUGGLING_WORDS_KEY]);
const EXCLUDED_PATTERNS = new Set(['due', 'live']);

// Create the persister using AsyncStorage when available
export const queryPersister = createAsyncStoragePersister({
  storage: getSafeStorage(),
  key: CACHE_KEY,
  throttleTime: THROTTLE_TIME,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

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

  // Handle vocabulary data (already checked for excluded patterns above)
  if (VOCABULARY_KEYS.has(firstKey)) {
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
