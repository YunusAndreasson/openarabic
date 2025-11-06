import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import {
  APP_SESSION_ID,
  articleQueries,
  CACHE_TIMES,
  fsrsQueries,
  readingProgressQueries,
} from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmark';
import { readingProgressService } from '@/services/readingProgress';
import type { Article } from '@/types/articles.types';
import { getBeginnerArticles, getRandomItems } from '@/utils/articleUtils';
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
  const { user } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const preloadLockRef = useRef(false);

  // Progressive loading: Load critical data first, then user-specific data
  const preloadCriticalData = useCallback(async () => {
    // Lock is handled by preloadAppData, no need to check here

    try {
      setPreloadProgress(10);

      // Load static data first (categories, basic articles list)
      // Use ensureQueryData to prioritize cache over network (TanStack Query v5 best practice)
      const criticalPromises = [
        queryClient.ensureQueryData(articleQueries.categories()),
        queryClient.ensureQueryData(articleQueries.all()),
      ];

      // CRITICAL FIX: Load reading progress synchronously with articles
      // This prevents race condition where filtered view renders before progress data is available
      const readingProgressPromise = user?.id
        ? queryClient.prefetchQuery({
            queryKey: readingProgressQueries.keys.bulk(user.id),
            queryFn: () => readingProgressService.getBulkProgress(user.id, []),
            staleTime: 0, // CRITICAL: Always fetch fresh data on app startup to prevent stale cache from blocking updates
            gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
            retry: 2,
          })
        : Promise.resolve();

      // Wait for BOTH articles AND reading progress to complete
      const [_categories, _articles] = await Promise.all([
        ...criticalPromises,
        readingProgressPromise,
      ]);
      setPreloadProgress(25);

      // Pre-compute and cache featured articles for immediate availability
      // CRITICAL: Only generate new featured articles if none exist for this session
      // This prevents articles from changing on app resume (backgrounding/foregrounding)
      if (Array.isArray(_articles) && _articles.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          try {
            // Check if featured articles already exist for this session
            const existingFeatured = queryClient.getQueryData([
              'featured-articles',
              'global',
              0,
              APP_SESSION_ID,
            ]);

            // Skip generation if featured articles already cached for this session
            if (existingFeatured) {
              return; // Use existing cached selection
            }

            const articles = _articles as Article[];
            const featured: Article[] = getRandomItems(articles, 5); // Get random 5 articles

            // Cache featured articles immediately with consistent query key
            // Include APP_SESSION_ID to ensure fresh articles on each app launch
            queryClient.setQueryData(['featured-articles', 'global', 0, APP_SESSION_ID], {
              articles: featured,
              reason: 'Pre-computed during startup',
              type: 'random' as const,
              dueWordRootIds: new Set<number>(),
            });

            // Prefetch images and details for featured articles with error handling
            const imagePrefetches = featured
              .map(a => String(a.image_url))
              .filter(Boolean)
              .map(url => Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => null)); // Silently handle prefetch failures

            // OPTIMIZED: Bulk fetch article details to prevent N+1 queries
            // Fetch all featured articles in a single query, then populate individual query caches
            const featuredIds = featured.map(a => a.id);
            const bulkPrefetchPromise = articlesService
              .getArticlesByIds(featuredIds)
              .then(fetchedArticles => {
                // Populate individual query caches to maintain compatibility with existing code
                fetchedArticles.forEach(article => {
                  queryClient.setQueryData(articleQueries.detail(article.id).queryKey, article);
                });
              })
              .catch(() => null); // Silently handle prefetch failures

            // Fire-and-forget; do not block loader
            Promise.allSettled([...imagePrefetches, bulkPrefetchPromise]).catch(() => {
              // Silent failure
            });
          } catch {
            // ignore prefetch errors
          }
        });
      }

      // Prefetch bookmark images for instant loading when user opens bookmarks
      if (user?.id) {
        InteractionManager.runAfterInteractions(async () => {
          try {
            const readingList = await bookmarkService.getReadingList(user.id);
            if (readingList.length > 0) {
              const imagePrefetches = readingList
                .map(item => String(item.articles?.image_url))
                .filter(Boolean)
                .map(url => Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => null));

              // Fire-and-forget; do not block loader
              Promise.allSettled(imagePrefetches).catch(() => {
                // Silently handle prefetch failures
              });
            }
          } catch {
            // Ignore bookmark prefetch errors
          }
        });
      }

      // Preload user's FSRS data if available
      if (user?.id) {
        try {
          // CRITICAL: Force refresh due words on app open to get latest calculations
          await queryClient.fetchQuery({
            ...fsrsQueries.due(user.id, 1),
            staleTime: 0, // Always fetch fresh data on app open
          });

          // Also refresh all words for accurate memory strength calculation
          await queryClient.fetchQuery({
            ...fsrsQueries.all(user.id),
            staleTime: 0, // Always fetch fresh data on app open
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

      setPreloadProgress(50);

      // Load user-specific background data asynchronously
      if (user?.id) {
        // Use setTimeout to defer background loading slightly, allowing UI to become responsive first
        setTimeout(() => {
          const backgroundPromises = [
            queryClient.ensureQueryData(articleQueries.authors()),
            queryClient.prefetchQuery({
              queryKey: readingProgressQueries.keys.readingList(user.id),
              queryFn: () => bookmarkService.getReadingList(user.id),
              ...CACHE_TIMES.MEDIUM,
              retry: 2,
            }),
          ];

          // Don't await - let these load in background
          Promise.allSettled(backgroundPromises).catch(() => {
            // Silent failure
          });
        }, 500); // Delay background loading by 500ms to prioritize initial UI responsiveness
      }

      setPreloadProgress(70);
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
    if (preloadLockRef.current) {
      return;
    }
    // Don't wait for auth - critical data (categories, articles) can load without user

    setIsPreloading(true);
    preloadLockRef.current = true;

    try {
      await preloadCriticalData();
    } finally {
      setIsPreloading(false);
      preloadLockRef.current = false;
    }
  }, [preloadCriticalData]);

  const prefetchArticle = useCallback(
    async (articleId: number) => {
      try {
        await queryClient.prefetchQuery(articleQueries.detail(articleId));
        return true;
      } catch {
        return false;
      }
    },
    [queryClient],
  );

  const prefetchVocabularyData = useCallback(async () => {
    if (!user?.id) return false;

    try {
      await Promise.allSettled([
        queryClient.prefetchQuery(fsrsQueries.allWithCooldown(user.id, 1)),
        queryClient.prefetchQuery(fsrsQueries.due(user.id, 1)),
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

    // CHECK: If featured articles already cached for this session, don't recalculate
    // APP_SESSION_ID ensures fresh selection on each app launch
    const existingFeatured = queryClient.getQueryData([
      'featured-articles',
      'global',
      0,
      APP_SESSION_ID,
    ]);
    if (existingFeatured) {
      return true; // Already have featured articles for this session, use cached selection
    }

    try {
      // Use ensureQueryData to prioritize cache for immutable articles
      const allArticles = await queryClient.ensureQueryData(articleQueries.all());

      if (!allArticles || allArticles.length === 0) return false;

      // Get user's study words to determine selection strategy
      const allStudyWords = await queryClient.fetchQuery({
        ...fsrsQueries.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
        staleTime: 180000,
      });

      const hasAnyStudyWords = allStudyWords.length > 0;

      // Get due words for intelligent selection
      const dueWords = await queryClient.fetchQuery({
        ...fsrsQueries.due(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
        staleTime: 60000, // 1 minute for due words
      });

      const dueWordRootIds = new Set(dueWords.map(word => word.root_id));

      // Perform intelligent featured article selection
      const performIntelligentSelection = () => {
        if (dueWordRootIds.size > 0) {
          const dueWordArticles = allArticles.filter(article =>
            article.article_sentences?.some(sentence =>
              sentence.sentence_words?.some(word => dueWordRootIds.has(word.root_id)),
            ),
          );

          if (dueWordArticles.length > 0) {
            const selected = getRandomItems(dueWordArticles, 5);
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
            const selected = getRandomItems(beginnerArticles, 5);
            return {
              articles: selected,
              reason: STRINGS.RECOMMENDED,
              type: 'beginner' as const,
              dueWordRootIds: new Set(),
            };
          }
        }

        // Final fallback: random selection
        return {
          articles: getRandomItems(allArticles, 5),
          reason: STRINGS.RECOMMENDED,
          type: 'random' as const,
          dueWordRootIds: new Set(),
        };
      };

      const featuredSelection = performIntelligentSelection();

      // Cache the featured articles for immediate use
      // Include APP_SESSION_ID to ensure fresh articles on each app launch
      queryClient.setQueryData(
        ['featured-articles', 'global', 0, APP_SESSION_ID],
        featuredSelection,
      );

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
