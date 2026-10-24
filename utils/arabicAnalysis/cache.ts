/**
 * FIFO cache management for Arabic word analysis
 */

import { CACHE_SIZE_LIMIT } from './constants';
import type { WordAnalysis } from './types';

// Separate caches for Arabic and English normalization to avoid contention
export const ARABIC_NORMALIZATION_CACHE = new Map<string, string>();
export const ENGLISH_NORMALIZATION_CACHE = new Map<string, string>();
export const ANALYSIS_CACHE = new Map<string, WordAnalysis>();

/**
 * Clear all analysis caches - useful for testing or after updating component definitions
 */
export function clearAnalysisCache(): void {
  ANALYSIS_CACHE.clear();
  ARABIC_NORMALIZATION_CACHE.clear();
  ENGLISH_NORMALIZATION_CACHE.clear();
}

/**
 * Cache helper with FIFO eviction: evicts the oldest *inserted* entry once the
 * cache reaches the limit (Map preserves insertion order).
 *
 * Deliberately NOT LRU, despite the name it used to carry — a read never
 * promotes an entry, so a hot key inserted early is still evicted before a cold
 * key inserted later. That is fine for word analysis (the working set is a
 * single article's vocabulary and turnover is low); the name was the only thing
 * that was wrong. Making it true LRU would mean re-inserting on every cache hit
 * at the read sites, which is not worth it here.
 */
export function cacheWithFifoEviction<K, V>(
  cache: Map<K, V>,
  key: K,
  value: V,
  limit: number = CACHE_SIZE_LIMIT,
): void {
  if (cache.size >= limit) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, value);
}
