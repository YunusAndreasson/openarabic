/**
 * Centralized query keys for consistent cache management
 *
 * Benefits:
 * - Type-safe query key generation
 * - Prevents typos and inconsistencies
 * - Single source of truth for cache keys
 * - Easier refactoring and maintenance
 *
 * Pattern: Use factory functions that return `as const` tuples
 * This provides TypeScript inference and prevents accidental mutations
 */

/**
 * Article-related query keys
 */
export const ARTICLE_QUERY_KEYS = {
  /**
   * All articles (no filters)
   */
  all: () => ['articles'] as const,

  /**
   * Single article by ID
   */
  detail: (articleId: number) => ['article', articleId] as const,

  /**
   * Articles with word statistics
   */
  withStats: () => ['articles', 'with-word-stats'] as const,

  /**
   * All authors
   */
  authors: () => ['authors'] as const,

  /**
   * All categories
   */
  categories: () => ['categories'] as const,
} as const;

/**
 * Reading list query keys
 */
export const READING_LIST_QUERY_KEYS = {
  /**
   * User's reading list (all bookmarked articles)
   * @param userId - User ID (required)
   */
  all: (userId: string) => ['readingList', userId] as const,

  /**
   * Single reading list entry for specific article
   * @param userId - User ID (required)
   * @param articleId - Article ID (required)
   */
  detail: (userId: string, articleId: number) => ['readingList', userId, articleId] as const,
} as const;

/**
 * Reading progress and streak query keys
 */
export const READING_PROGRESS_QUERY_KEYS = {
  /**
   * Bulk reading progress for all articles
   * @param userId - User ID (required)
   */
  bulk: (userId: string) => ['reading-progress-bulk', userId] as const,

  /**
   * Current reading streak
   * @param userId - User ID (required)
   */
  streak: (userId: string) => ['reading-streak', userId] as const,

  /**
   * Historical streak data
   * @param userId - User ID (required)
   * @param days - Number of days to fetch
   */
  streakHistory: (userId: string, days: number) => ['streak-history', userId, days] as const,
} as const;

/**
 * Audio-related query keys
 */
export const AUDIO_QUERY_KEYS = {
  /**
   * Enhanced audio tracks for user's reading list
   * @param userId - User ID (required)
   * @param audioPreference - Audio language preference (e.g., 'en', 'ar')
   */
  tracks: (userId: string, audioPreference: string) =>
    ['enhancedAudioTracks', userId, audioPreference] as const,
} as const;

/**
 * Combined export for convenience
 * Includes FSRS keys which are already centralized in constants/fsrs.ts
 */
export const QUERY_KEYS = {
  articles: ARTICLE_QUERY_KEYS,
  readingList: READING_LIST_QUERY_KEYS,
  readingProgress: READING_PROGRESS_QUERY_KEYS,
  audio: AUDIO_QUERY_KEYS,
} as const;

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
    staleTime: Infinity, // Static data does not change; prevent re-fetches
    gcTime: 172800000, // 48 hours
  },
} as const;
