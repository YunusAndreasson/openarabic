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
import { enhancedAudioService } from '@/services/audioPlaylist';
import { authorsService } from '@/services/authors';
import { bookmarkService } from '@/services/bookmark';
import { categoriesService } from '@/services/categories';
import { readingProgressService } from '@/services/readingProgress';
import { studySessionStreakService } from '@/services/studyStreak';
import { sentencesService } from '@/services/sentences';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { ArticleId, RootId } from '@/types/branded.types';
import { TIMING_CONSTANTS } from './animation';

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
 * Reading list and progress queries
 * Used for bookmarks and reading streaks
 */
export const readingProgressQueries = {
  /**
   * Reading list (bookmarks) for a user
   * Used for bookmark management and audio playlists
   */
  readingList: (userId: string) =>
    queryOptions({
      queryKey: ['readingList', userId] as const,
      queryFn: () => bookmarkService.getReadingList(userId),
      enabled: !!userId,
      staleTime: 5 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
      gcTime: 10 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
      retry: 2,
      retryDelay: attemptIndex =>
        Math.min(
          TIMING_CONSTANTS.RETRY_DELAY_BASE * 2 ** attemptIndex,
          TIMING_CONSTANTS.LONG_DELAY,
        ),
      placeholderData: [],
    }),

  /**
   * Bulk reading progress for a user
   * Single shared cache for all reading progress
   */
  bulk: (userId: string) =>
    queryOptions({
      queryKey: ['reading-progress-bulk', userId] as const,
      queryFn: () => readingProgressService.getBulkProgress(userId, []),
      enabled: !!userId,
      staleTime: 10000, // 10 seconds
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnMount: false,
      refetchOnReconnect: false,
      placeholderData: new Map(),
    }),

  /**
   * Query keys for backward compatibility
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
 * Audio queries
 * Used for audio playlists and playback
 */
export const audioQueries = {
  /**
   * Enhanced audio tracks for reading list
   * Used for audio playback with language preference
   */
  tracks: (userId: string, audioPreference: 'arabic' | 'bilingual') =>
    queryOptions({
      queryKey: ['enhancedAudioTracks', userId, audioPreference] as const,
      queryFn: () => enhancedAudioService.getReadingListEnhancedTracks(userId, audioPreference),
      enabled: !!userId,
      staleTime: 5 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
      gcTime: 10 * TIMING_CONSTANTS.SECONDS_PER_MINUTE * TIMING_CONSTANTS.MILLISECONDS_PER_SECOND,
      placeholderData: [],
    }),

  /**
   * Query keys for backward compatibility
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
 * Study streak queries
 * Used for vocabulary practice streak tracking
 */
export const studyStreakQueries = {
  /**
   * Current study streak metrics
   * Used for displaying streak count and motivation
   */
  streak: (userId: string) =>
    queryOptions({
      queryKey: ['study-streak', userId] as const,
      queryFn: () => studySessionStreakService.getStudySessionStreak(userId),
      enabled: !!userId,
      ...CACHE_TIMES.CRITICAL, // 30 seconds (time-sensitive)
      retry: 2,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }),

  /**
   * Study streak history with daily activity data
   * Used for visualization charts and detailed metrics
   */
  history: (userId: string, days: number = 40) =>
    queryOptions({
      queryKey: ['study-streak-history', userId, days, 'v2'] as const,
      queryFn: () => studySessionStreakService.getStudySessionHistory(userId, days),
      enabled: !!userId,
      ...CACHE_TIMES.CRITICAL, // 30 seconds (match streak counter for consistent UX)
      retry: 2,
      refetchOnMount: 'always', // Always refetch when chart opens to show fresh data
      refetchOnWindowFocus: false,
    }),

  /**
   * Query keys for backward compatibility
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

/**
 * Sentence queries
 * Used for fetching sentences containing specific words
 */
export const sentenceQueries = {
  /**
   * Sentences containing a specific word (by root_id)
   * Used for showing example sentences in dictionary
   */
  byRootId: (rootId: RootId, limit = 5) =>
    queryOptions({
      queryKey: ['sentences', 'by-root', rootId, limit] as const,
      queryFn: () => sentencesService.getSentencesByRootId(rootId, limit),
      ...CACHE_TIMES.ARTICLES, // Sentences never change (infinite staleTime)
      enabled: !!rootId,
      retry: 2,
    }),

  /**
   * Query keys for backward compatibility
   */
  keys: {
    byRootId: (rootId: RootId, limit = 5) => ['sentences', 'by-root', rootId, limit] as const,
  },
} as const;
