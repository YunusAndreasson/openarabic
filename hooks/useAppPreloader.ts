import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { studyWordsService } from '../services/studyWords';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { useAuth } from './useAuth';

// Cache duration constants
const MINUTE_IN_MS = 60000;
const STALE_TIME_SHORT = MINUTE_IN_MS; // 1 minute
const STALE_TIME_MEDIUM = 5 * MINUTE_IN_MS; // 5 minutes
const STALE_TIME_ALWAYS_FRESH = 0;
const PRELOAD_TIMEOUT_MS = 8000;

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
  const { user } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadComplete, setPreloadComplete] = useState(false);

  // Main preloading function
  const preloadAppData = async () => {
    // Don't set isPreloading if already in that state to avoid unnecessary re-renders
    if (!isPreloading) {
      setIsPreloading(true);
    }

    try {
      // Create an array of promises for parallel fetching
      const preloadPromises = [
        // Preload main articles list (home screen)
        queryClient.prefetchQuery({
          queryKey: ['articles'],
          queryFn: () => articlesService.getArticles(),
          staleTime: STALE_TIME_SHORT,
        }),

        // Preload categories (used in multiple screens)
        queryClient.prefetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          staleTime: STALE_TIME_MEDIUM,
        }),
      ];

      // Conditionally add user-specific data preloading
      if (user?.id) {
        // Preload vocabulary/study words if user is logged in
        preloadPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['studyWords', user.id],
            queryFn: () => studyWordsService.getStudyWords(user.id, { forStats: false }),
            staleTime: STALE_TIME_SHORT,
          })
        );

        // Also preload due words for vocabulary screen
        preloadPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['dueWords', user.id],
            queryFn: () => studyWordsService.getStudyWords(user.id, { onlyDue: true }),
            staleTime: STALE_TIME_ALWAYS_FRESH, // Always fetch fresh data for due words
          })
        );
      }

      // Add a safety timeout of 8 seconds to prevent infinite waiting
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Preloading timed out')), PRELOAD_TIMEOUT_MS)
      );

      // Wait for all preloading to complete OR timeout after 8 seconds
      await Promise.race([Promise.all(preloadPromises), timeoutPromise]).catch(error => {
        // Log timeout but continue with app initialization
        if (error.message === 'Preloading timed out') {
          // Data preloading timed out, continuing with partial data
        } else {
          throw error;
        }
      });

      // We've either loaded all data or hit the timeout, mark as complete
      setPreloadComplete(true);
    } catch (error) {
      // Fail silently - the app will fall back to regular loading
      // Still mark preloading as complete to not block the app
      setPreloadComplete(true);
    } finally {
      setIsPreloading(false);
    }
  };

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
    preloadAppData,
    prefetchArticle,
    refreshPreloadedData,
  };
};

export default useAppPreloader;
