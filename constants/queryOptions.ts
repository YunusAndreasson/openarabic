/**
 * Type-safe query options using TanStack Query v5 queryOptions helper
 *
 * Benefits:
 * - Automatic type inference for query data
 * - DRY: Single source of truth for query configuration
 * - Better IntelliSense and autocomplete
 * - Easier to maintain and test
 */

import { queryOptions } from '@tanstack/react-query';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { ARTICLE_QUERY_KEYS, CACHE_TIMES } from '@/constants/queryKeys';
import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { categoriesService } from '@/services/categories';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { ArticleId } from '@/types/branded.types';

/**
 * FSRS vocabulary query options
 * Used across 15+ files for consistent FSRS word queries
 */
export const fsrsQueryOptions = {
  /**
   * All FSRS words for a user (no filters, no cooldown)
   * Used for general word lists and statistics
   */
  all: (userId: string) =>
    queryOptions({
      queryKey: FSRS_QUERY_KEYS.all(userId),
      queryFn: () => studyWordsFSRSService.getFSRSWords(userId, { forStats: false }),
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
      queryKey: FSRS_QUERY_KEYS.due(userId),
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
   * All words with session cooldown filter
   * Used for capacity calculations and article selection
   */
  allWithCooldown: (userId: string, cooldownHours: number) =>
    queryOptions({
      queryKey: FSRS_QUERY_KEYS.allWithCooldown(userId, cooldownHours),
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
} as const;

/**
 * Article, category, and author query options
 * Used across 6+ files for consistent article-related queries
 */
export const articleQueryOptions = {
  /**
   * All articles (never change once written, infinite staleTime)
   * Used for library display and filtering
   */
  all: () =>
    queryOptions({
      queryKey: ARTICLE_QUERY_KEYS.all(),
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
      queryKey: ARTICLE_QUERY_KEYS.detail(articleId),
      queryFn: () => articlesService.getArticleById(articleId as ArticleId),
      ...CACHE_TIMES.ARTICLES, // Infinity staleTime
      enabled: !!articleId,
      retry: 2,
      placeholderData: old => old,
    }),

  /**
   * All categories (static, rarely change)
   * Used for filter sections and navigation
   */
  categories: () =>
    queryOptions({
      queryKey: ARTICLE_QUERY_KEYS.categories(),
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
      queryKey: ARTICLE_QUERY_KEYS.authors(),
      queryFn: () => authorsService.getUniqueAuthors(),
      ...CACHE_TIMES.STATIC, // 48 hours
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }),
} as const;
