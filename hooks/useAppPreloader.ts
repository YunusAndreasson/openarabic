import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useMemo } from 'react';

import { handleError } from '@/utils/errorHandling';

import { articlesService } from '../services/articles';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '../services/studyWordsFSRS';

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

interface AppPreloaderResult {
  isPreloading: boolean;
  isLoaded: boolean;
  preloadAppData: () => Promise<void>;
  prefetchArticle: (articleId: number) => Promise<boolean>;
  prefetchVocabularyData: () => Promise<boolean>;
  refreshPreloadedData: () => Promise<void>;
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

    try {
      const promises: Promise<unknown>[] = [
        queryClient.fetchQuery({
          queryKey: ['articles'],
          queryFn: () => articlesService.getArticles(),
          ...CACHE_TIMES.LONG,
          retry: 3,
        }),

        queryClient.fetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          ...CACHE_TIMES.VERY_LONG,
          retry: 3,
        }),
      ];

      if (user?.id) {
        promises.push(
          queryClient.fetchQuery({
            queryKey: ['readingList', user.id],
            queryFn: () => readingListService.getReadingList(user.id),
            ...CACHE_TIMES.MEDIUM,
            retry: 3,
          }),

          queryClient.fetchQuery({
            queryKey: FSRS_QUERY_KEYS.due(user.id),
            queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
            ...CACHE_TIMES.MEDIUM,
            retry: 3,
          }),

          queryClient.fetchQuery({
            queryKey: FSRS_QUERY_KEYS.all(user.id),
            queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
            ...CACHE_TIMES.LONG,
            retry: 3,
          })
        );
      }

      const results = await Promise.all(promises);
      const articlesData = results[0];
      setIsLoaded(Array.isArray(articlesData) && articlesData.length > 0);
    } catch (error) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(new Error(String(error)));
      }
      setIsLoaded(false);
    } finally {
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
