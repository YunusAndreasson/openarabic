/**
 * React Query configuration constants
 * Centralized cache times and query defaults for consistent data fetching
 */

// Base query configuration defaults
export const QUERY_DEFAULTS = {
  STALE_TIME: 300000, // 5 minutes - default for most data
  GC_TIME: 1000 * 60 * 60 * 24 * 7, // 7 days - match persistence maxAge
  MAX_RETRIES: 3,
  MUTATION_MAX_RETRIES: 2,
  MAX_RETRY_DELAY: 30000, // 30 seconds
} as const;

// Specialized cache times for different data types
export const CACHE_TIMES = {
  // For data that changes frequently (user study progress, due words)
  CRITICAL: {
    staleTime: 30000, // 30 seconds
    gcTime: 120000, // 2 minutes
  },
  // For user-specific data that changes moderately
  SHORT: {
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  },
  // For data that changes occasionally
  MEDIUM: {
    staleTime: 180000, // 3 minutes
    gcTime: 600000, // 10 minutes
  },
  // For articles (never update once written)
  ARTICLES: {
    staleTime: Infinity, // Articles never change once written
    gcTime: 86400000, // 24 hours
  },
  // For data that rarely changes
  LONG: {
    staleTime: QUERY_DEFAULTS.STALE_TIME, // Use default 5 minutes
    gcTime: 900000, // 15 minutes
  },
  // For categories and authors (never change)
  STATIC: {
    staleTime: 86400000, // 24 hours
    gcTime: 172800000, // 48 hours
  },
} as const;
