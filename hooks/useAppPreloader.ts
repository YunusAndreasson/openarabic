import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useMemo } from 'react';

import { handleError } from '@/utils/errorHandling';

import { articlesService } from '../services/articles';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '../services/studyWordsFSRS';
import * as Sentry from '@sentry/react-native';

import { useAuth } from './useAuth';

// Cache time constants in milliseconds
const CACHE_TIMES = {
  SHORT: {
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  },
  MEDIUM: {
    staleTime: 180000, // 3 minutes
    gcTime: 300000, // 5 minutes
  },
  LONG: {
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  },
  VERY_LONG: {
    staleTime: 600000, // 10 minutes
    gcTime: 900000, // 15 minutes
  },
} as const;

// Maximum time to wait for preloading before proceeding anyway
const PRELOAD_TIMEOUT_MS = 5000;

interface AppPreloaderResult {
  isPreloading: boolean;
  isLoaded: boolean;
  preloadAppData: () => Promise<void>;
  prefetchArticle: (articleId: number) => Promise<boolean>;
  prefetchVocabularyData: () => Promise<boolean>;
  refreshPreloadedData: () => Promise<void>;
}

/**
 * Helper function to add timeout to a promise
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<T>(resolve => {
    timeoutId = setTimeout(() => {
      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `[Preloader] Operation timed out after ${timeoutMs}ms`,
        level: 'warning',
      });
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Hook to preload app data during initialization
 */
export const useAppPreloader = (): AppPreloaderResult => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const preloadLockRef = useRef(false);

  // Main preloading function
  const preloadAppData = useCallback(async () => {
    if (isAuthLoading || isPreloading || preloadLockRef.current) {
      return;
    }

    preloadLockRef.current = true;
    setIsPreloading(true);
    setIsLoaded(false);

    // Track preload start time for performance monitoring
    const startTime = Date.now();

    try {
      // Log preload start
      Sentry.addBreadcrumb({
        category: 'preloader',
        message: 'Starting to preload app data',
        level: 'info',
      });

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: '[Preloader] Starting to preload app data',
        level: 'info',
      });

      // Create the basic promises
      const articlesPromise = queryClient.fetchQuery({
        queryKey: ['articles'],
        queryFn: () => articlesService.getArticles(),
        ...CACHE_TIMES.LONG,
        retry: 3,
      });

      const categoriesPromise = queryClient.fetchQuery({
        queryKey: ['categories'],
        queryFn: () => categoriesService.getCategories(),
        ...CACHE_TIMES.VERY_LONG,
        retry: 3,
      });

      // Add timeouts to prevent hanging
      const promises: Promise<unknown>[] = [
        withTimeout(articlesPromise, PRELOAD_TIMEOUT_MS, []),
        withTimeout(categoriesPromise, PRELOAD_TIMEOUT_MS, []),
      ];

      if (user?.id) {
        const readingListPromise = queryClient.fetchQuery({
          queryKey: ['readingList', user.id],
          queryFn: () => readingListService.getReadingList(user.id),
          ...CACHE_TIMES.MEDIUM,
          retry: 3,
        });

        const dueWordsPromise = queryClient.fetchQuery({
          queryKey: FSRS_QUERY_KEYS.due(user.id),
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
          ...CACHE_TIMES.MEDIUM,
          retry: 3,
        });

        const allWordsPromise = queryClient.fetchQuery({
          queryKey: FSRS_QUERY_KEYS.all(user.id),
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
          ...CACHE_TIMES.LONG,
          retry: 3,
        });

        // Add timeouts to these promises as well
        promises.push(
          withTimeout(readingListPromise, PRELOAD_TIMEOUT_MS, []),
          withTimeout(dueWordsPromise, PRELOAD_TIMEOUT_MS, []),
          withTimeout(allWordsPromise, PRELOAD_TIMEOUT_MS, [])
        );
      }

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `[Preloader] Waiting for ${promises.length} resources to load`,
        level: 'info',
      });

      // Ensure we don't wait indefinitely for all promises
      const overallTimeoutPromise = new Promise<unknown[]>(resolve => {
        setTimeout(() => {
          Sentry.addBreadcrumb({
            category: 'preloader',
            message: `[Preloader] Overall preload timed out after ${PRELOAD_TIMEOUT_MS}ms`,
            level: 'warning',
          });
          resolve([]);
        }, PRELOAD_TIMEOUT_MS);
      });

      // Use race with the timeout to ensure we don't hang
      const results = await Promise.race([Promise.all(promises), overallTimeoutPromise]);

      // Check if we have articles data
      const articlesData = results[0];
      const hasArticles = Array.isArray(articlesData) && articlesData.length > 0;

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `[Preloader] Preload complete, has articles: ${hasArticles}`,
        level: 'info',
      });

      setIsLoaded(hasArticles);

      // Log preload completion for performance monitoring
      const loadTime = Date.now() - startTime;
      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `Finished preloading in ${loadTime}ms, articles loaded: ${hasArticles}`,
        level: 'info',
      });

      // Send preload timing to analytics in production
      if (!__DEV__ && hasArticles) {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `App preload completed in ${loadTime}ms`,
          level: 'info',
        });
      }
    } catch (error) {
      // Calculate time spent before error
      const errorTime = Date.now() - startTime;

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `[Preloader] Error after ${errorTime}ms: ${error instanceof Error ? error.message : String(error)}`,
        level: 'error',
      });

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

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: `Error after ${errorTime}ms`,
        level: 'error',
      });

      setIsLoaded(false);
    } finally {
      Sentry.addBreadcrumb({
        category: 'preloader',
        message: '[Preloader] Finishing preload operation',
        level: 'info',
      });

      setIsPreloading(false);
      preloadLockRef.current = false;
    }
  }, [queryClient, user, isPreloading, isAuthLoading]);

  // Function to prefetch a specific article
  const prefetchArticle = useCallback(
    async (articleId: number) => {
      if (!articleId || articleId <= 0) return false;

      try {
        const prefetchPromises = [
          queryClient.prefetchQuery({
            queryKey: ['article', articleId],
            queryFn: () => articlesService.getArticleById(articleId),
            ...CACHE_TIMES.SHORT,
          }),
        ];

        if (user?.id) {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['isInReadingList', user.id, articleId],
              queryFn: () => readingListService.isInReadingList(user.id, articleId),
              ...CACHE_TIMES.SHORT,
            })
          );
        }

        // Use allSettled to handle partial failures
        const results = await Promise.allSettled(prefetchPromises);
        return results.some(result => result.status === 'fulfilled');
      } catch {
        return false;
      }
    },
    [queryClient, user?.id]
  );

  // Prefetch vocabulary data specifically
  const prefetchVocabularyData = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const results = await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.due(user.id),
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
          ...CACHE_TIMES.SHORT,
          retry: 3,
        }),
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.all(user.id),
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
          ...CACHE_TIMES.MEDIUM,
          retry: 3,
        }),
      ]);

      return results.some(result => result.status === 'fulfilled');
    } catch {
      return false;
    }
  }, [queryClient, user?.id]);

  // Force refresh of all data
  const refreshPreloadedData = useCallback(async () => {
    if (isPreloading) return;
    setIsLoaded(false);

    const queriesToInvalidate = [['articles'], ['categories']];
    if (user?.id) {
      queriesToInvalidate.push(
        [...FSRS_QUERY_KEYS.all(user.id)],
        [...FSRS_QUERY_KEYS.due(user.id)]
      );
    }

    try {
      // Run invalidation and preload in parallel
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: query =>
            queriesToInvalidate.some(
              key =>
                query.queryKey[0] === key[0] && (key.length === 1 || query.queryKey[1] === key[1])
            ),
        }),
        preloadAppData(),
      ]);
    } catch {
      if (!isPreloading) {
        setIsLoaded(true);
      }
    }
  }, [queryClient, user?.id, preloadAppData, isPreloading]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      isPreloading,
      isLoaded,
      preloadAppData,
      prefetchArticle,
      prefetchVocabularyData,
      refreshPreloadedData,
    }),
    [
      isPreloading,
      isLoaded,
      preloadAppData,
      prefetchArticle,
      prefetchVocabularyData,
      refreshPreloadedData,
    ]
  );

  return returnValue;
};

export default useAppPreloader;
