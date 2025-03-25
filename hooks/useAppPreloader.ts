import { useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { useAuth } from './useAuth';

// No caching - all data refreshes on every query
const MINUTE_IN_MS = 60000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const NO_CACHE = 0;
const LOAD_TIMEOUT_MS = 10000;
const MIN_LOADING_TIME = 500; // Minimum time to show loading state

// No caching for vocabulary data - always fresh
export const VOCAB_STALE_TIME = 0; // No caching

// No caching for articles - always fresh
export const ARTICLES_STALE_TIME = 0; // No caching
export const ARTICLES_GC_TIME = 0; // No garbage collection retention

// Only log errors in development
const logError = (message: string, error?: any) => {
  if (__DEV__) {
    console.error(message, error);
  }
};

const logWarning = (message: string, error?: any) => {
  if (__DEV__) {
    console.warn(message, error);
  }
};

/**
 * Hook to preload app data during initialization
 */
export const useAppPreloader = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const preloadLockRef = useRef(false);

  // Main preloading function
  const preloadAppData = useCallback(async () => {
    // If already preloading, return a promise that resolves when current preload completes
    if (isPreloading || preloadLockRef.current) {
      return new Promise<void>(resolve => {
        const checkPreload = () => {
          if (!isPreloading && !preloadLockRef.current) {
            resolve();
          } else {
            setTimeout(checkPreload, 100);
          }
        };
        checkPreload();
      });
    }

    preloadLockRef.current = true;
    setIsPreloading(true);
    setIsLoaded(false);

    const startTime = Date.now();

    try {
      const articlesPromise = queryClient
        .fetchQuery({
          queryKey: ['articles'],
          queryFn: () => articlesService.getArticles(),
          staleTime: NO_CACHE, // No caching
          gcTime: NO_CACHE, // No cache retention
        })
        .catch(error => {
          logWarning('Failed to load articles:', error);
          return [];
        });

      const categoriesPromise = queryClient
        .fetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          staleTime: NO_CACHE, // No caching
          gcTime: NO_CACHE, // No cache retention
        })
        .catch(error => {
          logWarning('Failed to load categories:', error);
          return [];
        });

      // Start user data loading if user is logged in
      const userDataPromises: Promise<any>[] = [];
      if (user?.id) {
        userDataPromises.push(
          queryClient
            .fetchQuery({
              queryKey: ['dueWords', user.id],
              queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
              staleTime: NO_CACHE, // No caching
              gcTime: NO_CACHE, // No cache retention
            })
            .catch(error => {
              logWarning('Failed to load due words:', error);
              return [];
            }),

          queryClient
            .fetchQuery({
              queryKey: ['studyWords', user.id],
              queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
              staleTime: NO_CACHE, // No caching
              gcTime: NO_CACHE, // No cache retention
            })
            .catch(error => {
              logWarning('Failed to load study words:', error);
              return [];
            }),

          queryClient
            .fetchQuery({
              queryKey: ['readingList', user.id],
              queryFn: () => readingListService.getReadingList(user.id),
              staleTime: NO_CACHE, // No caching
              gcTime: NO_CACHE, // No cache retention
            })
            .catch(error => {
              logWarning('Failed to load reading list:', error);
              return [];
            })
        );
      }

      // Load data with timeout and validate articles in parallel
      const articles = await Promise.race<any[]>([
        articlesPromise,
        new Promise<any[]>(resolve => {
          setTimeout(() => {
            logWarning('Data loading timeout reached, proceeding with available data');
            resolve([]);
          }, LOAD_TIMEOUT_MS);
        }),
      ]);

      // Continue loading other data in background
      Promise.all([categoriesPromise, ...userDataPromises]).catch(error => {
        logWarning('Some background data failed to load:', error);
      });

      const hasValidArticles = Array.isArray(articles) && articles.length > 0;
      if (!hasValidArticles) {
        logWarning('No valid articles data available');
      }

      // Ensure minimum loading time has passed
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }
    } catch (error) {
      logError('Error during preload:', error);
    } finally {
      setIsLoaded(true);
      setIsPreloading(false);
      preloadLockRef.current = false;
    }
  }, [queryClient, user, isPreloading]);

  // Function to prefetch a specific article
  const prefetchArticle = useCallback(
    async (articleId: number) => {
      if (!articleId) return false;

      try {
        // Always fetch fresh data
        const prefetchPromises = [
          queryClient.prefetchQuery({
            queryKey: ['article', articleId],
            queryFn: () => articlesService.getArticleById(articleId),
            staleTime: NO_CACHE, // No caching
            gcTime: NO_CACHE, // No cache retention
          }),
        ];

        if (user?.id) {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['isInReadingList', user.id, articleId],
              queryFn: () => readingListService.isInReadingList(user.id, articleId),
              staleTime: NO_CACHE, // No caching
              gcTime: NO_CACHE, // No cache retention
            })
          );
        }

        await Promise.all(prefetchPromises);
        return true;
      } catch (error) {
        logError('Article prefetch failed:', error);
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
      // Always fetch fresh data
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['dueWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
          staleTime: NO_CACHE, // No caching
          gcTime: NO_CACHE, // No cache retention
        }),

        queryClient.prefetchQuery({
          queryKey: ['studyWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
          staleTime: NO_CACHE, // No caching
          gcTime: NO_CACHE, // No cache retention
        }),
      ]);

      return true;
    } catch (error) {
      logError('Vocabulary data prefetch failed:', error);
      return false;
    }
  }, [queryClient, user?.id]);

  // Force refresh of all data
  const refreshPreloadedData = useCallback(async () => {
    if (isPreloading) return; // Prevent concurrent refreshes
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
      console.error('Failed to refresh data:', error);
      // Only set loaded state if preloadAppData wasn't started
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
      criticalDataLoaded: isLoaded,
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
