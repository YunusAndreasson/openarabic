import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { useAuth } from './useAuth';

// Cache duration constants
const MINUTE_IN_MS = 60000;
const STALE_TIME_SHORT = MINUTE_IN_MS; // 1 minute
const STALE_TIME_MEDIUM = 5 * MINUTE_IN_MS; // 5 minutes
const STALE_TIME_ALWAYS_FRESH = 0;
const CRITICAL_DATA_TIMEOUT_MS = 3000;
const NON_CRITICAL_DATA_TIMEOUT_MS = 5000;

interface UserSettings {
  lastOpenedArticle?: number;
  [key: string]: any;
}

/**
 * Hook to preload essential app data during initialization
 *
 * This hook prefetches common data needed by multiple screens to improve
 * perceived performance and reduce loading indicators after initial app load.
 *
 * @returns Object containing loading state and preloading control functions
 */
export const useAppPreloader = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [criticalDataLoaded, setCriticalDataLoaded] = useState(false);

  // Main preloading function - now combines and replaces the previous prefetchData effect
  const preloadAppData = useCallback(async () => {
    // Don't set isPreloading if already in that state to avoid unnecessary re-renders
    if (!isPreloading) {
      setIsPreloading(true);
    }

    // Reset state for each preload cycle
    setCriticalDataLoaded(false);
    setPreloadComplete(false);

    try {
      // STEP 1: Load critical data first (data needed for initial UI render)
      const criticalPromises = [
        // Preload main articles list (home screen) - critical for index page
        queryClient.prefetchQuery({
          queryKey: ['articles'],
          queryFn: () => articlesService.getArticles(),
          staleTime: STALE_TIME_SHORT,
        }),
      ];

      // Add user-specific critical data if user is logged in
      if (user?.id) {
        criticalPromises.push(
          // Due words are critical for logged-in users who might want to study
          queryClient.prefetchQuery({
            queryKey: ['dueWords', user.id],
            queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
            staleTime: STALE_TIME_ALWAYS_FRESH,
          })
        );
      }

      // Critical data timeout - shorter than non-critical
      const criticalTimeoutPromise = new Promise(resolve =>
        setTimeout(resolve, CRITICAL_DATA_TIMEOUT_MS)
      );

      // Wait for critical data or timeout
      await Promise.race([Promise.all(criticalPromises), criticalTimeoutPromise]);

      // Mark critical data as loaded to allow UI to transition
      setCriticalDataLoaded(true);

      // STEP 2: Load non-critical data in the background
      const nonCriticalPromises = [
        // Categories data - used in filters but not needed for initial render
        queryClient.prefetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          staleTime: STALE_TIME_MEDIUM,
        }),
      ];

      // Add user-specific non-critical data if user is logged in
      if (user?.id) {
        // Study words detail data - needed for vocabulary screen but not immediately
        nonCriticalPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['studyWords', user.id],
            queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
            staleTime: STALE_TIME_SHORT,
          })
        );

        // Try to prefetch the user's last opened article if available
        const settings = (await queryClient.getQueryData([
          'userSettings',
          user.id,
        ])) as UserSettings;
        if (settings?.lastOpenedArticle) {
          nonCriticalPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['article', settings.lastOpenedArticle],
              queryFn: () => articlesService.getArticleById(settings.lastOpenedArticle!),
              staleTime: STALE_TIME_MEDIUM,
            })
          );
        }
      }

      // Non-critical data timeout
      const nonCriticalTimeoutPromise = new Promise(resolve =>
        setTimeout(resolve, NON_CRITICAL_DATA_TIMEOUT_MS)
      );

      // Wait for non-critical data or timeout
      await Promise.race([Promise.all(nonCriticalPromises), nonCriticalTimeoutPromise]);

      // All preloading complete
      setPreloadComplete(true);
    } catch (error) {
      // Fail silently but ensure state is properly set
      if (!criticalDataLoaded) {
        setCriticalDataLoaded(true);
      }
      setPreloadComplete(true);
    } finally {
      setIsPreloading(false);
    }
  }, [queryClient, user, isPreloading, isAuthLoading]);

  // Function to prefetch a specific article
  const prefetchArticle = async (articleId: number) => {
    if (!articleId) return;

    try {
      // Prefetch the specific article
      await queryClient.prefetchQuery({
        queryKey: ['article', articleId],
        queryFn: () => articlesService.getArticleById(articleId),
        staleTime: STALE_TIME_SHORT,
      });

      // Prefetch reading list status if user is logged in
      if (user?.id) {
        await queryClient.prefetchQuery({
          queryKey: ['isInReadingList', user.id, articleId],
          queryFn: () => readingListService.isInReadingList(user.id, articleId),
          staleTime: STALE_TIME_SHORT,
        });
      }

      return true;
    } catch (error) {
      // Failed to prefetch article
      return false;
    }
  };

  // Force refresh of preloaded data
  const refreshPreloadedData = () => {
    // Reset state
    setPreloadComplete(false);
    setCriticalDataLoaded(false);

    // Batch invalidate common queries
    const queriesToInvalidate = [['articles'], ['categories']];

    // Add user-specific queries if user is logged in
    if (user?.id) {
      queriesToInvalidate.push(['studyWords', user.id], ['dueWords', user.id]);
    }

    // Invalidate all queries in one operation
    queryClient.invalidateQueries({
      predicate: query => {
        return queriesToInvalidate.some(
          key => query.queryKey[0] === key[0] && (key.length === 1 || query.queryKey[1] === key[1])
        );
      },
    });

    // Trigger a new preload
    preloadAppData();
  };

  return {
    isPreloading,
    preloadComplete,
    criticalDataLoaded,
    preloadAppData,
    prefetchArticle,
    refreshPreloadedData,
  };
};

export default useAppPreloader;
