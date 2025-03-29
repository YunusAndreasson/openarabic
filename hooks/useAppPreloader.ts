import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { useAuth } from './useAuth';
import { useAppSelector } from '@/store/hooks';

/**
 * Hook to preload app data during initialization
 */
export const useAppPreloader = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const preloadLockRef = useRef(false);

  // Get settings to check if they're loaded
  const settings = useAppSelector(state => state.settings);
  const theme = useAppSelector(state => state.theme);

  // Check if Redux store has been hydrated with settings
  useEffect(() => {
    if (
      settings &&
      typeof settings.fontScale === 'number' &&
      typeof settings.showEnglish === 'boolean' &&
      theme &&
      typeof theme.theme === 'string'
    ) {
      setSettingsReady(true);
    }
  }, [settings, theme]);

  // Main preloading function
  const preloadAppData = useCallback(async () => {
    // If auth is still loading or already preloading, return early
    if (isAuthLoading || isPreloading || preloadLockRef.current) {
      return;
    }

    preloadLockRef.current = true;
    setIsPreloading(true);
    setIsLoaded(false);

    try {
      // Load everything in parallel for faster startup
      const promises: Promise<any>[] = [
        // Core data with increased stale/cache times for better performance
        queryClient.fetchQuery({
          queryKey: ['articles'],
          queryFn: () => articlesService.getArticles(),
          staleTime: 600000, // 10 minutes
          gcTime: 1800000, // 30 minutes
          retry: 2,
        }),

        queryClient.fetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          staleTime: 1200000, // 20 minutes
          gcTime: 3600000, // 1 hour
          retry: 2,
        }),
      ];

      // Load user data in parallel if logged in
      if (user?.id) {
        promises.push(
          queryClient.fetchQuery({
            queryKey: ['readingList', user.id],
            queryFn: () => readingListService.getReadingList(user.id),
            staleTime: 120000, // 2 minutes
            gcTime: 300000, // 5 minutes
            retry: 3,
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
          }),

          queryClient.fetchQuery({
            queryKey: ['dueWords', user.id],
            queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
            staleTime: 180000, // 3 minutes
            gcTime: 300000, // 5 minutes
            retry: 2,
          }),

          queryClient.fetchQuery({
            queryKey: ['studyWords', user.id],
            queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
            staleTime: 300000, // 5 minutes
            gcTime: 600000, // 10 minutes
            retry: 2,
          })
        );
      }

      await Promise.all(promises);
    } finally {
      setIsLoaded(true);
      setIsPreloading(false);
      preloadLockRef.current = false;
    }
  }, [queryClient, user, isPreloading, isAuthLoading]);

  // Function to prefetch a specific article
  const prefetchArticle = useCallback(
    async (articleId: number) => {
      if (!articleId) return false;

      try {
        const prefetchPromises = [
          queryClient.prefetchQuery({
            queryKey: ['article', articleId],
            queryFn: () => articlesService.getArticleById(articleId),
            staleTime: 0, // No caching
            gcTime: 0, // No cache retention
          }),
        ];

        if (user?.id) {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['isInReadingList', user.id, articleId],
              queryFn: () => readingListService.isInReadingList(user.id, articleId),
              staleTime: 0, // No caching
              gcTime: 0, // No cache retention
            })
          );
        }

        await Promise.all(prefetchPromises);
        return true;
      } catch (error) {
        queryClient.setQueryData(['article', articleId], null);
        return false;
      }
    },
    [queryClient, user?.id]
  );

  // Prefetch vocabulary data specifically
  const prefetchVocabularyData = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Use consistent cache settings
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['dueWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
          staleTime: 120000,
          gcTime: 300000,
          retry: 2,
        }),

        queryClient.prefetchQuery({
          queryKey: ['studyWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
          staleTime: 180000,
          gcTime: 600000,
          retry: 2,
        }),
      ]);

      return true;
    } catch (error) {
      return false;
    }
  }, [queryClient, user?.id]);

  // Force refresh of all data
  const refreshPreloadedData = useCallback(async () => {
    if (isPreloading) return;
    setIsLoaded(false);

    const queriesToInvalidate = [['articles'], ['categories']];
    if (user?.id) {
      queriesToInvalidate.push(['studyWords', user.id], ['dueWords', user.id]);
    }

    try {
      await queryClient.invalidateQueries({
        predicate: query =>
          queriesToInvalidate.some(
            key =>
              query.queryKey[0] === key[0] && (key.length === 1 || query.queryKey[1] === key[1])
          ),
      });
      await preloadAppData();
    } catch (error) {
      if (!isPreloading) {
        setIsLoaded(true);
      }
    }
  }, [queryClient, user?.id, preloadAppData, isPreloading]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      isPreloading,
      preloadComplete: isLoaded,
      criticalDataLoaded: isLoaded && settingsReady, // Only consider critical data loaded if settings are ready
      settingsReady, // Export this flag to check specifically for settings readiness
      preloadAppData,
      prefetchArticle,
      prefetchVocabularyData,
      refreshPreloadedData,
    }),
    [
      isPreloading,
      isLoaded,
      settingsReady,
      preloadAppData,
      prefetchArticle,
      prefetchVocabularyData,
      refreshPreloadedData,
    ]
  );

  return returnValue;
};

export default useAppPreloader;
