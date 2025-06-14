import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

// Constants for better performance and maintainability
const CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE';
const THROTTLE_TIME = 1000; // 1 second
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Pre-defined sets for faster lookups
const STATIC_DATA_KEYS = new Set(['categories', 'authors', 'articles']);
const FILTERED_ARTICLE_KEYS = new Set(['filtered-articles']);
const USER_DATA_KEYS = new Set(['readingList']);
const VOCABULARY_KEYS = new Set(['fsrs-words', 'vocabulary-stats']);
const EXCLUDED_KEYS = new Set(['isInReadingList', 'audio-tracks', 'struggling-words']);
const EXCLUDED_PATTERNS = new Set(['due', 'live']);

// Create the persister using AsyncStorage
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  throttleTime: THROTTLE_TIME,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Optimized shouldDehydrateQuery function
const shouldDehydrateQuery = (query: Query): boolean => {
  const queryKey = query.queryKey;
  const firstKey = queryKey[0] as string;

  // Fast lookups using Sets
  if (
    STATIC_DATA_KEYS.has(firstKey) ||
    FILTERED_ARTICLE_KEYS.has(firstKey) ||
    USER_DATA_KEYS.has(firstKey)
  ) {
    return true;
  }

  // Handle vocabulary data with exclusions
  if (VOCABULARY_KEYS.has(firstKey)) {
    // Don't persist real-time due words
    return !queryKey.some(key => typeof key === 'string' && EXCLUDED_PATTERNS.has(key));
  }

  // Fast exclusion checks
  if (EXCLUDED_KEYS.has(firstKey)) {
    return false;
  }

  // Check for excluded patterns in any part of the query key
  if (queryKey.some(key => typeof key === 'string' && EXCLUDED_PATTERNS.has(key))) {
    return false;
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

/**
 * Clear persisted cache (useful for debugging or user logout)
 */
export const clearPersistedCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('✅ Persisted React Query cache cleared');
  } catch (error) {
    console.error('❌ Failed to clear persisted cache:', error);
  }
};

/**
 * Get the size of persisted cache for debugging
 */
export const getPersistedCacheSize = async (): Promise<number> => {
  try {
    const cache = await AsyncStorage.getItem(CACHE_KEY);
    if (!cache) return 0;

    // Calculate size in bytes (approximate)
    return new TextEncoder().encode(cache).length;
  } catch (error) {
    console.error('❌ Failed to get persisted cache size:', error);
    return 0;
  }
};
