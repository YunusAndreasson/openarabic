import { useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { categoriesService } from '../services/categories';
import { readingListService } from '../services/readingList';
import { useAuth } from './useAuth';

// Cache duration constants
const MINUTE_IN_MS = 60000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const STALE_TIME_SHORT = MINUTE_IN_MS; // 1 minute
const STALE_TIME_ALWAYS_FRESH = 0;
const LOAD_TIMEOUT_MS = 10000;
const MIN_LOADING_TIME = 500; // Minimum time to show loading state

// Single-device optimization - much longer cache time for vocabulary data
// Since vocabulary data only changes on this device, we can cache it longer
export const VOCAB_STALE_TIME = 30 * MINUTE_IN_MS; // 30 minutes

// Article optimization - much longer cache time for articles
// Since articles are static once published and only updated once per day
export const ARTICLES_STALE_TIME = 4 * HOUR_IN_MS; // 4 hours
export const ARTICLES_GC_TIME = 24 * HOUR_IN_MS; // 24 hours

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
          staleTime: ARTICLES_STALE_TIME, // Much longer stale time for articles
          gcTime: ARTICLES_GC_TIME, // Keep data in cache for a full day
        })
        .catch(error => {
          logWarning('Failed to load articles:', error);
          return [];
        });

      const categoriesPromise = queryClient
        .fetchQuery({
          queryKey: ['categories'],
          queryFn: () => categoriesService.getCategories(),
          staleTime: ARTICLES_STALE_TIME, // Categories change with articles, so same cache time
          gcTime: ARTICLES_GC_TIME,
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
              staleTime: STALE_TIME_ALWAYS_FRESH,
            })
            .catch(error => {
              logWarning('Failed to load due words:', error);
              return [];
            }),

          queryClient
            .fetchQuery({
              queryKey: ['studyWords', user.id],
              queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
              staleTime: STALE_TIME_SHORT,
            })
            .catch(error => {
              logWarning('Failed to load study words:', error);
              return [];
            }),

          queryClient
            .fetchQuery({
              queryKey: ['readingList', user.id],
              queryFn: () => readingListService.getReadingList(user.id),
              staleTime: STALE_TIME_SHORT,
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
        // Check if article is already in cache
        const existingArticle = queryClient.getQueryData(['article', articleId]);
        if (existingArticle) {
          // Article already cached, no need to fetch again
          return true;
        }

        const prefetchPromises = [
          queryClient.prefetchQuery({
            queryKey: ['article', articleId],
            queryFn: () => articlesService.getArticleById(articleId),
            staleTime: ARTICLES_STALE_TIME, // Much longer stale time for individual articles
            gcTime: ARTICLES_GC_TIME,
          }),
        ];

        if (user?.id) {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['isInReadingList', user.id, articleId],
              queryFn: () => readingListService.isInReadingList(user.id, articleId),
              staleTime: STALE_TIME_SHORT, // This can change frequently based on user actions
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
      // Use much longer stale time for vocabulary data since changes only happen on this device
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['dueWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
          staleTime: VOCAB_STALE_TIME,
        }),

        queryClient.prefetchQuery({
          queryKey: ['studyWords', user.id],
          queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { forStats: false }),
          staleTime: VOCAB_STALE_TIME,
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
