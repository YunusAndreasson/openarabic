import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import {
  APP_SESSION_ID,
  articleQueries,
  fsrsQueries,
  PRACTICE_DUE_WORDS_LIMIT,
  readingProgressQueries,
} from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { articlesService } from '@/services/articles';
import { readingProgressService } from '@/services/readingProgress';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { getBeginnerArticles, getRandomItems } from '@/utils/articleUtils';
import { handleError, toError } from '@/utils/errorHandling';
import { MAX_FEATURED_ARTICLES } from '@/hooks/articles/useMultipleFeaturedArticles';

/**
 * Applied to every AWAITED query on the appReady-blocking path. The global
 * networkMode is 'online', under which an offline cold start PAUSES fetches
 * indefinitely (the promise never settles) and the splash never hides.
 * 'offlineFirst' always runs the first attempt; the app's global retry
 * function returns false while offline, so the fetch rejects fast and the
 * existing catch paths proceed to setIsLoaded(true).
 */
const OFFLINE_FIRST = { networkMode: 'offlineFirst' } as const;

interface AppPreloaderResult {
  isPreloading: boolean;
  isLoaded: boolean;
  preloadAppData: () => Promise<void>;
  prefetchArticle: (articleId: ArticleId) => Promise<boolean>;
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
      const allArticles = await queryClient.ensureQueryData({
        ...articleQueries.all(),
        ...OFFLINE_FIRST,
      });

      if (!allArticles || allArticles.length === 0) return false;

      // Get user's study words to determine selection strategy
      // Use ensureQueryData to reuse cached data from useAppBadge/preloader
      const allStudyWords = await queryClient.ensureQueryData({
        ...fsrsQueries.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
        ...OFFLINE_FIRST,
      });

      const hasAnyStudyWords = allStudyWords.length > 0;

      // Get due words for intelligent selection (already cached from preloader)
      const dueWords = await queryClient.ensureQueryData({
        ...fsrsQueries.due(user.id),
        ...OFFLINE_FIRST,
      });

      const dueWordRootIds = new Set(dueWords.map(word => word.root_id));

      // Perform intelligent featured article selection
      const performIntelligentSelection = () => {
        if (dueWordRootIds.size > 0) {
          const dueWordArticles = allArticles.filter(article =>
            article.article_sentences.some(sentence =>
              sentence.sentence_words?.some(word => dueWordRootIds.has(word.root_id)),
            ),
          );

          if (dueWordArticles.length > 0) {
            const selected = getRandomItems(dueWordArticles, MAX_FEATURED_ARTICLES);
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
            const selected = getRandomItems(beginnerArticles, MAX_FEATURED_ARTICLES);
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
          articles: getRandomItems(allArticles, MAX_FEATURED_ARTICLES),
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
  }, [user, queryClient]);

  // Progressive loading: Load critical data first, then user-specific data
  const preloadCriticalData = useCallback(async () => {
    // Lock is handled by preloadAppData, no need to check here

    try {
      setPreloadProgress(10);

      // Load static data first (categories, basic articles list)
      // Use ensureQueryData to prioritize cache over network (TanStack Query v5 best practice)
      const criticalPromises = [
        queryClient.ensureQueryData({ ...articleQueries.categories(), ...OFFLINE_FIRST }),
        queryClient.ensureQueryData({ ...articleQueries.all(), ...OFFLINE_FIRST }),
      ];

      // CRITICAL FIX: Load reading progress synchronously with articles
      // This prevents race condition where filtered view renders before progress data is available
      // (prefetchQuery never throws, but it must SETTLE — hence OFFLINE_FIRST)
      const readingProgressPromise = user?.id
        ? queryClient.prefetchQuery({
            queryKey: readingProgressQueries.bulk(user.id).queryKey,
            queryFn: () => readingProgressService.getBulkProgress(user.id, []),
            staleTime: 0, // CRITICAL: Always fetch fresh data on app startup to prevent stale cache from blocking updates
            gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
            retry: 2,
            ...OFFLINE_FIRST,
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
            const featured: Article[] = getRandomItems(articles, MAX_FEATURED_ARTICLES);

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
            Promise.allSettled([...imagePrefetches, bulkPrefetchPromise]).catch(error => {
              Sentry.captureException(error, { tags: { location: 'preloader:featured-prefetch' } });
            });
          } catch {
            // ignore prefetch errors
          }
        });
      }

      // Prefetch bookmark images for instant loading when user opens bookmarks
      // Uses ensureQueryData to reuse the TanStack Query cache and prevent N+1 API calls
      if (user?.id) {
        InteractionManager.runAfterInteractions(async () => {
          try {
            const readingList = await queryClient.ensureQueryData(
              readingProgressQueries.readingList(user.id),
            );
            if (readingList.length > 0) {
              const imagePrefetches = readingList
                .map(item => String(item.articles.image_url))
                .filter(Boolean)
                .map(url => Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => null));

              // Fire-and-forget; do not block loader
              Promise.allSettled(imagePrefetches).catch(error => {
                Sentry.captureException(error, {
                  tags: { location: 'preloader:bookmark-prefetch' },
                });
              });
            }
          } catch {
            // Ignore bookmark prefetch errors
          }
        });
      }

      // Preload user's FSRS data if available. The bare due entry (no cooldown,
      // no limit) is what useArabicWord/useArticlesByDueWords and the
      // due-backlog gate read; fsrsQueries.all feeds the word lists.
      if (user?.id) {
        try {
          await queryClient.ensureQueryData({ ...fsrsQueries.due(user.id), ...OFFLINE_FIRST });
          await queryClient.ensureQueryData({ ...fsrsQueries.all(user.id), ...OFFLINE_FIRST });

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
            queryClient.ensureQueryData(readingProgressQueries.readingList(user.id)),
          ];

          // Don't await - let these load in background
          Promise.allSettled(backgroundPromises).catch(error => {
            Sentry.captureException(error, { tags: { location: 'preloader:background' } });
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
    async (articleId: ArticleId) => {
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
      // Warm EXACTLY the queryOptions the practice home screen consumes via
      // useFSRSQueries (fsrsQueries.all + the cooldown/limit-keyed due entry) —
      // any other shape would fill a cache entry nobody reads.
      await Promise.allSettled([
        queryClient.prefetchQuery(fsrsQueries.all(user.id)),
        queryClient.prefetchQuery(
          fsrsQueries.due(user.id, DEFAULT_SESSION_COOLDOWN_HOURS, PRACTICE_DUE_WORDS_LIMIT),
        ),
      ]);
      return true;
    } catch (error) {
      handleError(toError(error), { showToast: false });
      return false;
    }
  }, [queryClient, user]);

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
