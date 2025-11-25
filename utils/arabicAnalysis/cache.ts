/**
 * LRU Cache management for Arabic word analysis
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
 * Cache helper with LRU (Least Recently Used) eviction strategy
 * Evicts the oldest entry when cache size reaches the limit
 */
export function cacheWithLRUEviction<K, V>(
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
