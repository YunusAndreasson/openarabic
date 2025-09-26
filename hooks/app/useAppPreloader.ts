import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { bookmarkService } from '@/services/bookmark';
import { categoriesService } from '@/services/categories';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { handleError } from '@/utils/errorHandling';

interface AppPreloaderResult {
  isPreloading: boolean;
  isLoaded: boolean;
  preloadAppData: () => Promise<void>;
  prefetchArticle: (articleId: number) => Promise<boolean>;
  prefetchVocabularyData: () => Promise<boolean>;
  prefetchFeaturedArticles: () => Promise<boolean>;
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
          queryFn: () => articlesService.getArticles({ limit: 20 }), // Load fewer articles initially for faster startup
          ...CACHE_TIMES.ARTICLES,
          retry: 3,
        }),
      ];

      const [_categories, _articles] = await Promise.all(criticalPromises);
      setPreloadProgress(25);

      // Pre-compute and cache featured articles for immediate availability
      if (Array.isArray(_articles) && _articles.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          try {
            const articles = _articles as Article[];
            const featured: Article[] = articles.slice(0, 5); // Get first 5 articles as featured

            // Cache featured articles immediately with consistent query key
            queryClient.setQueryData(['featured-articles', 'global', 0], {
              articles: featured,
              reason: 'Pre-computed during startup',
              type: 'random' as const,
              dueWordRootIds: new Set<number>(),
            });

            // Prefetch images and details for featured articles with error handling
            const imagePrefetches = featured
              .map(a => String(a.image_url))
              .filter(Boolean)
              .map(url => Image.prefetch(url).catch(() => null)); // Silently handle prefetch failures
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
          // CRITICAL: Force refresh due words on app open to get latest calculations
          await queryClient.fetchQuery({
            queryKey: FSRS_QUERY_KEYS.due(user.id),
            queryFn: () =>
              studyWordsFSRSService.getFSRSWords(user.id, {
                onlyDue: true,
                // Align with session cooldown to avoid showing words that were just reviewed
                sessionCooldownHours: 1,
                limit: 100,
              }),
            staleTime: 0, // Always fetch fresh data on app open
            gcTime: CACHE_TIMES.CRITICAL.gcTime,
            retry: 2,
          });

          // Also refresh all words for accurate memory strength calculation
          await queryClient.fetchQuery({
            queryKey: FSRS_QUERY_KEYS.all(user.id),
            queryFn: () =>
              studyWordsFSRSService.getFSRSWords(user.id, {
                forStats: false,
                limit: 1000,
              }),
            staleTime: 0, // Always fetch fresh data on app open
            gcTime: CACHE_TIMES.CRITICAL.gcTime,
            retry: 2,
          });

          // Preload featured articles to prevent glitching when library loads
          try {
            await prefetchFeaturedArticles();
          } catch {
            // Ignore featured articles prefetch errors - will fall back to on-demand selection
          }
        } catch {
          // Ignore errors - will fall back to random selection
        }
      }

      setPreloadProgress(40);

      // Load user-specific background data asynchronously
      if (user?.id) {
        // Use setTimeout to defer background loading slightly, allowing UI to become responsive first
        setTimeout(() => {
          const backgroundPromises = [
            queryClient.prefetchQuery({
              queryKey: ['authors'],
              queryFn: () => authorsService.getAuthors(),
              ...CACHE_TIMES.STATIC,
              retry: 2,
            }),
            queryClient.prefetchQuery({
              queryKey: ['readingList', user.id],
              queryFn: () => bookmarkService.getReadingList(user.id),
              ...CACHE_TIMES.MEDIUM,
              retry: 2,
            }),
          ];

          // Don't await - let these load in background
          Promise.allSettled(backgroundPromises).catch(() => {});
        }, 500); // Delay background loading by 500ms to prioritize initial UI responsiveness
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
          queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, 1),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              forStats: true,
              limit: 1000,
              sessionCooldownHours: 1,
            }),
          ...CACHE_TIMES.MEDIUM,
          retry: 2,
        }),
        queryClient.prefetchQuery({
          queryKey: FSRS_QUERY_KEYS.due(user.id),
          queryFn: () =>
            studyWordsFSRSService.getFSRSWords(user.id, {
              onlyDue: true,
              // Align with session cooldown to avoid flicker
              sessionCooldownHours: 1,
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

  // Pre-select featured articles to prevent glitching when library loads
  const prefetchFeaturedArticles = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Fetch all articles first
      const allArticles = await queryClient.fetchQuery({
        queryKey: ['articles'],
        queryFn: () => articlesService.getArticles(),
        staleTime: 300000, // 5 minutes
        gcTime: 600000, // 10 minutes
      });

      if (!allArticles || allArticles.length === 0) return false;

      // Get user's study words to determine selection strategy
      const allStudyWords = await queryClient.fetchQuery({
        queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
        queryFn: () =>
          studyWordsFSRSService.getFSRSWords(user.id, {
            forStats: true,
            limit: 1,
          }),
        staleTime: 180000,
        gcTime: 600000,
      });

      const hasAnyStudyWords = allStudyWords.length > 0;

      // Get due words for intelligent selection
      const dueWords = await queryClient.fetchQuery({
        queryKey: FSRS_QUERY_KEYS.due(user.id),
        queryFn: () =>
          studyWordsFSRSService.getFSRSWords(user.id, {
            onlyDue: true,
            sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
          }),
        staleTime: 60000, // 1 minute for due words
        gcTime: 300000,
      });

      const dueWordRootIds = new Set(dueWords.map(word => word.root_id));

      // Perform intelligent featured article selection
      const performIntelligentSelection = () => {
        if (dueWordRootIds.size > 0) {
          const dueWordArticles = allArticles.filter(article =>
            article.article_sentences?.some(sentence =>
              sentence.sentence_words?.some((word: any) => dueWordRootIds.has(word.root_id))
            )
          );

          if (dueWordArticles.length > 0) {
            const selected = dueWordArticles.slice(0, 5);
            return {
              articles: selected,
              reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE,
              type: 'due-words' as const,
              dueWordRootIds,
            };
          }
        }

        // Fallback to beginner articles for new users
        if (!user?.id || !hasAnyStudyWords) {
          const beginnerArticles = getBeginnerArticles(allArticles);
          if (beginnerArticles.length > 0) {
            const selected = beginnerArticles.slice(0, 5);
            return {
              articles: selected,
              reason: STRINGS.RECOMMENDED,
              type: 'beginner' as const,
              dueWordRootIds: new Set(),
            };
          }
        }

        // Final fallback: random selection
        const shuffled = [...allArticles].sort(() => 0.5 - Math.random());
        return {
          articles: shuffled.slice(0, 5),
          reason: STRINGS.RECOMMENDED,
          type: 'random' as const,
          dueWordRootIds: new Set(),
        };
      };

      const featuredSelection = performIntelligentSelection();

      // Cache the featured articles for immediate use
      queryClient.setQueryData(['featured-articles', 'global', 0], featuredSelection);

      return true;
    } catch {
      // Featured articles prefetch failed - silently continue with cached or default content
      return false;
    }
  }, [user?.id, queryClient]);

  return {
    isPreloading,
    isLoaded,
    preloadAppData,
    prefetchArticle,
    prefetchVocabularyData,
    prefetchFeaturedArticles,
    preloadProgress,
  };
};

export default useAppPreloader;
