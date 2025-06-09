import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useMemo } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { handleError } from '@/utils/errorHandling';

// Cache time constants in milliseconds - optimized for different data types
const CACHE_TIMES = {
  // For data that changes frequently (user study progress, due words)
  CRITICAL: {
    staleTime: 30000, // 30 seconds - for critical data that changes frequently
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
  // For articles (updated maximum once a day)
  ARTICLES: {
    staleTime: 3600000, // 1 hour - articles update max once a day
    gcTime: 7200000, // 2 hours
  },
  // For data that rarely changes
  LONG: {
    staleTime: 300000, // 5 minutes
    gcTime: 900000, // 15 minutes
  },
  // For categories and authors (never change)
  STATIC: {
    staleTime: 86400000, // 24 hours - categories and authors never change
    gcTime: 172800000, // 48 hours
  },
} as const;

interface AppPreloaderResult {
  isPreloading: boolean;
  isLoaded: boolean;
  preloadAppData: () => Promise<void>;
  preloadCriticalData: () => Promise<void>;
  preloadUserData: () => Promise<void>;
  prefetchArticle: (articleId: number) => Promise<boolean>;
  prefetchVocabularyData: () => Promise<boolean>;
  refreshPreloadedData: () => Promise<void>;
  preloadProgress: number; // 0-100 percentage
}

/**
 * Hook to preload app data during initialization with progressive loading
 */
export const useAppPreloader = (): AppPreloaderResult => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const preloadLockRef = useRef(false);

  // Progressive loading: Load critical data first, then user-specific data
  const preloadCriticalData = useCallback(async () => {
    if (preloadLockRef.current) return;

    try {
      setPreloadProgress(10);

      // Load static data first (categories, basic articles list)
      const criticalPromises = [
        queryClient.fetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          ...CACHE_TIMES.STATIC,
          retry: 3,
        }),
        queryClient.fetchQuery({
          queryKey: ['articles', 'minimal'],
          queryFn: () => articlesService.getArticles({ limit: 20 }), // Load first 20 articles
          ...CACHE_TIMES.ARTICLES,
          retry: 3,
        }),
      ];

      await Promise.all(criticalPromises);
      setPreloadProgress(40);

      // Load remaining articles in background
      queryClient.prefetchQuery({
        queryKey: ['articles'],
        queryFn: () => articlesService.getArticles(),
        ...CACHE_TIMES.ARTICLES,
        retry: 2,
      });

      setPreloadProgress(60);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { location: 'preloader_critical' },
      });
      throw error;
    }
  }, [queryClient]);

  // Load user-specific data
  const preloadUserData = useCallback(async () => {
    if (!user?.id || preloadLockRef.current) return;

    try {
      setPreloadProgress(70);

      const userPromises = [
        // Load user's reading list
        queryClient.fetchQuery({
          queryKey: ['readingList', user.id],
          queryFn: () => readingListService.getReadingList(user.id),
          ...CACHE_TIMES.MEDIUM,
          retry: 3,
        }),
        // Load due words (critical for vocabulary features)
        queryClient.fetchQuery({
          queryKey: FSRS_QUERY_KEYS.due(user.id),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              onlyDue: true,
              limit: 50, // Limit initial load
            }),
          ...CACHE_TIMES.CRITICAL,
          retry: 3,
        }),
      ];

      await Promise.all(userPromises);
      setPreloadProgress(90);

      // Load remaining vocabulary data in background
      queryClient.prefetchQuery({
        queryKey: FSRS_QUERY_KEYS.all(user.id),
        queryFn: () =>
          studyWordsFSRSService.getFSRSWords(user.id, {
            forStats: true, // Load minimal data for stats
            limit: 100,
          }),
        ...CACHE_TIMES.MEDIUM,
        retry: 2,
      });

      setPreloadProgress(100);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { location: 'preloader_user' },
      });
      throw error;
    }
  }, [queryClient, user?.id]);

  // Main preloading function with progressive loading
  const preloadAppData = useCallback(async () => {
    if (isAuthLoading || isPreloading || preloadLockRef.current) {
      return;
    }

    preloadLockRef.current = true;
    setIsPreloading(true);
    setIsLoaded(false);
    setPreloadProgress(0);

    const startTime = Date.now();

    try {
      Sentry.addBreadcrumb({
        category: 'preloader',
        message: 'Starting progressive app data preload',
        level: 'info',
      });

      // Phase 1: Load critical data (categories, initial articles)
      await preloadCriticalData();

      // Phase 2: Load user-specific data if authenticated
      if (user?.id) {
        await preloadUserData();
      } else {
        setPreloadProgress(100);
      }

      const loadTime = Date.now() - startTime;
      setIsLoaded(true);

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `Progressive preload completed in ${loadTime}ms`,
        level: 'info',
      });

      // Background prefetch of additional data
      if (user?.id) {
        // Prefetch articles with word stats for due words analysis
        queryClient.prefetchQuery({
          queryKey: ['articles', 'with-word-stats'],
          queryFn: () => articlesService.getArticlesWithWordStats(),
          ...CACHE_TIMES.ARTICLES,
          retry: 1,
        });
      }
    } catch (error) {
      const errorTime = Date.now() - startTime;

      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: {
            location: 'app_preloader',
            loadTime: errorTime.toString(),
          },
        });
        handleError(error);
      } else {
        const wrappedError = new Error(String(error));
        Sentry.captureException(wrappedError, {
          tags: {
            location: 'app_preloader',
            loadTime: errorTime.toString(),
          },
        });
        handleError(wrappedError);
      }

      // Set partial load state - app can still function with critical data
      const hasCategories = queryClient.getQueryData(['categories']);
      const hasArticles =
        queryClient.getQueryData(['articles', 'minimal']) || queryClient.getQueryData(['articles']);

      if (hasCategories && hasArticles) {
        setIsLoaded(true);
        setPreloadProgress(100);
      } else {
        setIsLoaded(false);
        setPreloadProgress(0);
      }

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `Error after ${errorTime}ms, partial load: ${hasCategories && hasArticles}`,
        level: 'error',
      });
    } finally {
      setIsPreloading(false);
      preloadLockRef.current = false;
    }
  }, [queryClient, user, isPreloading, isAuthLoading, preloadCriticalData, preloadUserData]);

  // Optimized function to prefetch a specific article
  const prefetchArticle = useCallback(
    async (articleId: number) => {
      if (!articleId || articleId <= 0) return false;

      try {
        // First try to get card data (lighter payload)
        const cardPromise = queryClient.prefetchQuery({
          queryKey: ['article', 'card', articleId],
          queryFn: () => articlesService.getArticleCard(articleId),
          ...CACHE_TIMES.SHORT,
        });

        // Then prefetch full article data in background
        const fullPromise = queryClient.prefetchQuery({
          queryKey: ['article', articleId],
          queryFn: () => articlesService.getArticleById(articleId),
          ...CACHE_TIMES.SHORT,
        });

        // Prefetch reading list status if user is authenticated
        const readingListPromise = user?.id
          ? queryClient.prefetchQuery({
              queryKey: ['isInReadingList', user.id, articleId],
              queryFn: () => readingListService.isInReadingList(user.id, articleId),
              ...CACHE_TIMES.SHORT,
            })
          : Promise.resolve();

        // Wait for card data, let others load in background
        await cardPromise;

        // Don't await these - let them load in background
        fullPromise.catch(() => {}); // Ignore errors for background loading
        readingListPromise.catch(() => {});

        return true;
      } catch {
        return false;
      }
    },
    [queryClient, user?.id]
  );

  // Optimized vocabulary data prefetching
  const prefetchVocabularyData = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const results = await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.due(user.id),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              onlyDue: true,
              limit: 50,
            }),
          ...CACHE_TIMES.CRITICAL,
          retry: 2,
        }),
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.all(user.id),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              forStats: true,
              limit: 100,
            }),
          ...CACHE_TIMES.MEDIUM,
          retry: 2,
        }),
      ]);

      return results.some(result => result.status === 'fulfilled');
    } catch {
      return false;
    }
  }, [queryClient, user?.id]);

  // Optimized refresh with selective invalidation
  const refreshPreloadedData = useCallback(async () => {
    if (isPreloading) return;

    setIsLoaded(false);
    setPreloadProgress(0);

    try {
      // Invalidate critical queries first
      const criticalQueries: (string | readonly string[])[] = [
        ['articles'],
        ['articles', 'minimal'],
        ['categories'],
      ];

      if (user?.id) {
        criticalQueries.push(
          ['readingList', user.id],
          FSRS_QUERY_KEYS.due(user.id),
          FSRS_QUERY_KEYS.all(user.id)
        );
      }

      // Invalidate and refetch in parallel
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: query => {
            const queryKey = query.queryKey;
            return criticalQueries.some(key => {
              const keyArray = Array.isArray(key) ? key : [key];
              return keyArray.every((keyPart, index) => queryKey[index] === keyPart);
            });
          },
        }),
        preloadAppData(),
      ]);
    } catch (error) {
      if (!isPreloading) {
        setIsLoaded(true);
        setPreloadProgress(100);
      }
      Sentry.captureException(error, {
        tags: { location: 'preloader_refresh' },
      });
    }
  }, [queryClient, user?.id, preloadAppData, isPreloading]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      isPreloading,
      isLoaded,
      preloadAppData,
      preloadCriticalData,
      preloadUserData,
      prefetchArticle,
      prefetchVocabularyData,
      refreshPreloadedData,
      preloadProgress,
    }),
    [
      isPreloading,
      isLoaded,
      preloadAppData,
      preloadCriticalData,
      preloadUserData,
      prefetchArticle,
      prefetchVocabularyData,
      refreshPreloadedData,
      preloadProgress,
    ]
  );

  return returnValue;
};

export default useAppPreloader;
