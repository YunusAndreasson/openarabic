/**
 * Unified query management with TanStack Query v5
 *
 * This file consolidates query keys and queryOptions into a single source of truth.
 * Each domain (fsrs, articles, readingProgress, audio) has:
 * - Query factories with co-located keys and options
 * - Invalidation helpers for bulk cache updates
 *
 * Benefits:
 * - Zero duplication between keys and options
 * - Type-safe query configuration
 * - Simplified cache invalidation (75% less code)
 * - Better IntelliSense and autocomplete
 * - Official TanStack Query v5 pattern
 */

import { queryOptions, type QueryClient } from '@tanstack/react-query';

/**
 * Unique session identifier generated once per app launch.
 * Used to ensure featured articles are different each time the app is opened.
 * This is efficient because:
 * - No network calls are made (articles are already cached)
 * - Only affects client-side random selection from cached data
 * - Prevents stale featured articles from persisted cache
 */
export const APP_SESSION_ID = Date.now();

import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { categoriesService } from '@/services/categories';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { ArticleId } from '@/types/branded.types';

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

/**
 * FSRS vocabulary queries
 * Used across 15+ files for consistent FSRS word queries
 */
export const fsrsQueries = {
  /**
   * All FSRS words for a user (no filters, no cooldown)
   * Used for general word lists and statistics
   */
  all: (userId: string) =>
    queryOptions({
      queryKey: ['fsrs-words', userId] as const,
      queryFn: () => studyWordsFSRSService.getFSRSWords(userId, { forStats: false }),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      retry: 3,
    }),

  /**
   * All words with session cooldown filter
   * Used for capacity calculations and article selection
   */
  allWithCooldown: (userId: string, cooldownHours: number) =>
    queryOptions({
      queryKey: ['fsrs-words', userId, 'all', 'cooldown', cooldownHours] as const,
      queryFn: () =>
        studyWordsFSRSService.getFSRSWords(userId, {
          forStats: true,
          sessionCooldownHours: cooldownHours,
          limit: 1000,
        }),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      retry: 3,
    }),

  /**
   * Due words only (time-sensitive)
   * Used for practice sessions and due word counts
   */
  due: (userId: string, sessionCooldownHours?: number) =>
    queryOptions({
      queryKey: ['fsrs-words', userId, 'due'] as const,
      queryFn: () =>
        studyWordsFSRSService.getFSRSWords(userId, {
          onlyDue: true,
          ...(sessionCooldownHours !== undefined ? { sessionCooldownHours } : {}),
          limit: 100,
        }),
      enabled: !!userId,
      ...CACHE_TIMES.SHORT,
      retry: 2,
    }),

  /**
   * FSRS statistics for a user
   * Used for charts and progress displays
   */
  stats: (userId: string) =>
    queryOptions({
      queryKey: ['fsrs-words', userId, 'stats'] as const,
      queryFn: () =>
        studyWordsFSRSService.getFSRSWords(userId, {
          forStats: true,
          limit: 1000,
        }),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      retry: 3,
    }),

  /**
   * Invalidate all FSRS queries for a user
   * Use after: completing practice session, adding/removing words
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fsrs-words', userId] }),
      queryClient.invalidateQueries({ queryKey: ['struggling-words', userId] }),
    ]);
  },

  /**
   * Invalidate specific common FSRS queries (more precise)
   * Use for: targeted updates without full cache clear
   */
  invalidateCommon: (queryClient: QueryClient, userId: string, cooldownHours: number = 2) => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: fsrsQueries.all(userId).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: fsrsQueries.allWithCooldown(userId, cooldownHours).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: fsrsQueries.due(userId).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: fsrsQueries.stats(userId).queryKey,
      }),
    ]);
  },
} as const;

/**
 * Article queries (articles, categories, authors)
 * Used across 10+ files for library and reading
 */
export const articleQueries = {
  /**
   * All articles (never change once written, infinite staleTime)
   * Used for library display and filtering
   */
  all: () =>
    queryOptions({
      queryKey: ['articles'] as const,
      queryFn: () => articlesService.getArticles(),
      ...CACHE_TIMES.ARTICLES, // Infinity staleTime
      retry: 3,
      refetchOnWindowFocus: false,
      placeholderData: old => old,
    }),

  /**
   * Single article details by ID
   * Used for article reader and prefetching
   */
  detail: (articleId: number) =>
    queryOptions({
      queryKey: ['article', articleId] as const,
      queryFn: () => articlesService.getArticleById(articleId as ArticleId),
      ...CACHE_TIMES.ARTICLES, // Infinity staleTime
      enabled: !!articleId,
      retry: 2,
      placeholderData: old => old,
    }),

  /**
   * Articles with word statistics
   * Used for capacity-based recommendations
   */
  withStats: () =>
    queryOptions({
      queryKey: ['articles', 'with-word-stats'] as const,
      queryFn: () => articlesService.getArticlesWithWordStats(),
      ...CACHE_TIMES.ARTICLES,
      retry: 3,
    }),

  /**
   * All categories (static, rarely change)
   * Used for filter sections and navigation
   */
  categories: () =>
    queryOptions({
      queryKey: ['categories'] as const,
      queryFn: () => categoriesService.getCategories(),
      ...CACHE_TIMES.STATIC, // 48 hours
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }),

  /**
   * All unique authors (static, rarely change)
   * Used for filter sections and navigation
   */
  authors: () =>
    queryOptions({
      queryKey: ['authors'] as const,
      queryFn: () => authorsService.getUniqueAuthors(),
      ...CACHE_TIMES.STATIC, // 48 hours
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }),

  /**
   * Invalidate all article-related data
   * Use after: data refresh, pull-to-refresh
   */
  invalidateAll: (queryClient: QueryClient) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['articles'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['authors'] }),
    ]);
  },
} as const;

/**
 * Reading list and progress query keys
 * Used for bookmarks and reading streaks
 * Note: These use direct service calls, not queryOptions
 */
export const readingProgressQueries = {
  /**
   * Query keys for reading progress data
   */
  keys: {
    readingList: (userId: string) => ['readingList', userId] as const,
    readingListDetail: (userId: string, articleId: number) =>
      ['readingList', userId, articleId] as const,
    bulk: (userId: string) => ['reading-progress-bulk', userId] as const,
    streak: (userId: string) => ['reading-streak', userId] as const,
    streakHistory: (userId: string, days: number) => ['streak-history', userId, days] as const,
  },

  /**
   * Invalidate all reading-related queries for a user
   * Use after: adding/removing bookmarks, completing articles
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['reading-streak', userId] }),
      queryClient.invalidateQueries({ queryKey: ['readingList', userId] }),
      queryClient.invalidateQueries({ queryKey: ['reading-progress-bulk', userId] }),
    ]);
  },
} as const;

/**
 * Audio query keys
 * Used for audio playlists and playback
 * Note: These use direct service calls, not queryOptions
 */
export const audioQueries = {
  /**
   * Query keys for audio data
   */
  keys: {
    tracks: (userId: string, audioPreference: string) =>
      ['enhancedAudioTracks', userId, audioPreference] as const,
  },

  /**
   * Invalidate audio tracks
   * Use after: reading list changes, audio preference changes
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return queryClient.invalidateQueries({ queryKey: ['enhancedAudioTracks', userId] });
  },
} as const;

/**
 * Study streak query keys
 * Used for vocabulary practice streak tracking
 */
export const studyStreakQueries = {
  /**
   * Query keys for study streak data
   */
  keys: {
    streak: (userId: string) => ['study-streak', userId] as const,
    history: (userId: string, days: number = 365) =>
      ['study-streak-history', userId, days] as const,
  },

  /**
   * Invalidate all study streak queries for a user
   * Use after: completing practice session, manual streak updates
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['study-streak', userId] }),
      queryClient.invalidateQueries({ queryKey: ['study-streak-history', userId] }),
    ]);
  },
} as const;
