import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { categoriesService } from '@/services/categories';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';

interface AppPreloaderResult {
  isPreloading: boolean;
  isLoaded: boolean;
  preloadAppData: () => Promise<void>;
  prefetchArticle: (articleId: number) => Promise<boolean>;
  prefetchVocabularyData: () => Promise<boolean>;
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
          queryKey: ['articles'],
          queryFn: () => articlesService.getArticles(), // Load all articles
          ...CACHE_TIMES.ARTICLES,
          retry: 3,
        }),
      ];

      const [_categories, _articles] = await Promise.all(criticalPromises);
      setPreloadProgress(25);

      // Prefetch featured slider assets (images + article details) without blocking UI
      if (Array.isArray(_articles) && _articles.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          try {
            const featured: Article[] = (_articles as Article[]).slice(0, 5);
            const imagePrefetches = featured
              .map(a => String(a.image_url))
              .filter(Boolean)
              .map(url => Image.prefetch(url));
            const detailPrefetches = featured.map(a =>
              queryClient.prefetchQuery({
                queryKey: ['article', a.id],
                queryFn: () => articlesService.getArticleById(a.id),
                ...CACHE_TIMES.ARTICLES,
                retry: 2,
              })
            );
            // Fire-and-forget; do not block loader
            Promise.allSettled([...imagePrefetches, ...detailPrefetches]).catch(() => {});
          } catch {
            // ignore prefetch errors
          }
        });
      }

      // Preload user's FSRS data if available
      if (user?.id) {
        try {
          await queryClient.fetchQuery({
            queryKey: FSRS_QUERY_KEYS.due(user.id),
            queryFn: () =>
              studyWordsFSRSService.getFSRSWords(user.id, {
                onlyDue: true,
                limit: 100,
              }),
            ...CACHE_TIMES.CRITICAL,
            retry: 2,
          });
        } catch {
          // Ignore errors - will fall back to random selection
        }
      }

      setPreloadProgress(40);

      // Load user-specific background data asynchronously
      if (user?.id) {
        const backgroundPromises = [
          queryClient.prefetchQuery({
            queryKey: ['authors'],
            queryFn: () => authorsService.getAuthors(),
            ...CACHE_TIMES.STATIC,
            retry: 2,
          }),
          queryClient.prefetchQuery({
            queryKey: ['readingList', user.id],
            queryFn: () => readingListService.getReadingList(user.id),
            ...CACHE_TIMES.MEDIUM,
            retry: 2,
          }),
        ];

        // Don't await - let these load in background
        Promise.allSettled(backgroundPromises).catch(() => {});
      }

      setPreloadProgress(80);
      setIsLoaded(true);
      setPreloadProgress(100);

      Sentry.addBreadcrumb({
        category: 'preloader',
        message: 'App preload complete',
        level: 'info',
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { location: 'preloader' },
        extra: { userId: user?.id },
      });

      setIsLoaded(true);
      setPreloadProgress(100);
    }
  }, [queryClient, user]);

  const preloadAppData = useCallback(async () => {
    if (isPreloading || preloadLockRef.current) return;
    if (isAuthLoading) return;

    setIsPreloading(true);
    preloadLockRef.current = true;

    try {
      await preloadCriticalData();
    } finally {
      setIsPreloading(false);
      preloadLockRef.current = false;
    }
  }, [isPreloading, isAuthLoading, preloadCriticalData]);

  const prefetchArticle = useCallback(
    async (articleId: number) => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ['article', articleId],
          queryFn: () => articlesService.getArticleById(articleId),
          ...CACHE_TIMES.ARTICLES,
          retry: 2,
        });
        return true;
      } catch {
        return false;
      }
    },
    [queryClient]
  );

  const prefetchVocabularyData = useCallback(async () => {
    if (!user?.id) return false;

    try {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.all(user.id),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              forStats: true,
              limit: 1000,
            }),
          ...CACHE_TIMES.MEDIUM,
          retry: 2,
        }),
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.due(user.id),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              onlyDue: true,
              limit: 100,
            }),
          ...CACHE_TIMES.MEDIUM,
          retry: 2,
        }),
      ]);
      return true;
    } catch (error) {
      handleError(error as Error, { showToast: false });
      return false;
    }
  }, [queryClient, user?.id]);

  return {
    isPreloading,
    isLoaded,
    preloadAppData,
    prefetchArticle,
    prefetchVocabularyData,
    preloadProgress,
  };
};

export default useAppPreloader;
