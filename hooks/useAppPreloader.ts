import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { studyWordsService } from '../services/studyWords';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { useAuth } from './useAuth';

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
          staleTime: 60000, // 1 minute cache
        }),

        // Preload categories (used in multiple screens)
        queryClient.prefetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          staleTime: 300000, // 5 minutes cache
        }),
      ];

      // Conditionally add user-specific data preloading
      if (user?.id) {
        // Preload vocabulary/study words if user is logged in
        preloadPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['studyWords', user.id],
            queryFn: () => studyWordsService.getStudyWords(user.id, { forStats: false }),
            staleTime: 60000, // 1 minute cache
          })
        );

        // Also preload due words for vocabulary screen
        preloadPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['dueWords', user.id],
            queryFn: () => studyWordsService.getStudyWords(user.id, { onlyDue: true }),
            staleTime: 0, // Always fetch fresh data for due words
          })
        );
      }

      // Add a safety timeout of 8 seconds to prevent infinite waiting
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Preloading timed out')), 8000)
      );

      // Wait for all preloading to complete OR timeout after 8 seconds
      await Promise.race([Promise.all(preloadPromises), timeoutPromise]).catch(error => {
        // Log timeout but continue with app initialization
        if (error.message === 'Preloading timed out') {
          console.warn('Data preloading timed out, continuing with partial data');
        } else {
          throw error;
        }
      });

      // We've either loaded all data or hit the timeout, mark as complete
      setPreloadComplete(true);
    } catch (error) {
      // Fail silently - the app will fall back to regular loading
      console.warn('Data preloading failed:', error);
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
        staleTime: 60000, // 1 minute cache
      });

      // Prefetch reading list status if user is logged in
      if (user?.id) {
        await queryClient.prefetchQuery({
          queryKey: ['isInReadingList', user.id, articleId],
          queryFn: () => readingListService.isInReadingList(user.id, articleId),
          staleTime: 60000, // 1 minute cache
        });
      }

      return true;
    } catch (error) {
      console.warn(`Failed to prefetch article ${articleId}:`, error);
      return false;
    }
  };

  // Force refresh of preloaded data
  const refreshPreloadedData = () => {
    // Reset state
    setPreloadComplete(false);

    // Invalidate existing queries
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });

    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
    }

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
