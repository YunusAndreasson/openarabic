import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';

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
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import {
  filterArticlesContainingRoots,
  getBeginnerArticles,
  getRandomItems,
} from '@/utils/articleUtils';
import { breadcrumb, handleError, toError } from '@/utils/errorHandling';
import { runWhenIdle } from '@/utils/runWhenIdle';
import { generateStorageUrl } from '@/utils/storageUtils';
import { MAX_FEATURED_ARTICLES } from '@/hooks/articles/useMultipleFeaturedArticles';

/**
 * Applied to every AWAITED query on the appReady-blocking path, so each one
 * settles — resolves or rejects — on its first attempt.
 *
 * The global networkMode is 'online', under which a fetch started offline
 * PAUSES until the connection returns; 'offlineFirst' always runs the first
 * attempt instead. `retry: false` matters just as much: under ANY retry the
 * retryer sleeps after a failure and then pauses for as long as the device is
 * offline (or the app backgrounded), so the awaited promise never settled and
 * the splash stayed up until the network came back. The factories each carry a
 * retry policy, and a factory's `retry` is what `query()` uses, so it has to be
 * overridden here rather than left to the client default. Each query's own
 * observers still retry under the factory's policy once a screen mounts it.
 */
const SPLASH_GATE = { networkMode: 'offlineFirst', retry: false } as const;

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
      // The three inputs are read together. The preloader has already started
      // all of them, so these join those fetches (or hit the cache) instead of
      // queueing one round trip behind another.
      const [allArticles, allStudyWords, dueWords] = await Promise.all([
        queryClient.query({
          ...articleQueries.all(),
          ...SPLASH_GATE,
          staleTime: 'static',
        }),
        queryClient.query({
          ...fsrsQueries.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
          ...SPLASH_GATE,
          staleTime: 'static',
        }),
        queryClient.query({
          ...fsrsQueries.due(user.id),
          ...SPLASH_GATE,
          staleTime: 'static',
        }),
      ]);

      if (!allArticles || allArticles.length === 0) return false;

      const hasAnyStudyWords = allStudyWords.length > 0;

      const dueWordRootIds = new Set(dueWords.map(word => word.root_id));

      // Perform intelligent featured article selection
      const performIntelligentSelection = () => {
        if (dueWordRootIds.size > 0) {
          const dueWordArticles = filterArticlesContainingRoots(allArticles, dueWordRootIds);

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
        queryClient.query({
          ...articleQueries.categories(),
          ...SPLASH_GATE,
          staleTime: 'static',
        }),
        queryClient.query({ ...articleQueries.all(), ...SPLASH_GATE, staleTime: 'static' }),
      ];

      // CRITICAL FIX: Load reading progress synchronously with articles
      // This prevents race condition where filtered view renders before progress data is available
      // (this must SETTLE, never reject — hence SPLASH_GATE and the .catch
      // below: it is awaited in the Promise.all that gates the whole preload)
      const readingProgressPromise = user?.id
        ? queryClient
            .query({
              ...readingProgressQueries.bulk(user.id),
              staleTime: 0, // CRITICAL: Always fetch fresh data on app startup to prevent stale cache from blocking updates
              ...SPLASH_GATE,
            })
            .catch(() => undefined)
        : Promise.resolve();

      // The user's word queries start now, alongside the critical ones, rather
      // than after them: the splash waits for both, and running them in series
      // cost two to three extra round trips on every cold start. The bare due
      // entry (no cooldown, no limit) is what useSentenceSelectedRoots,
      // useArticlesByDueWords and the due-backlog gate read; fsrsQueries.all
      // feeds the word lists; allWithCooldown feeds the featured selection.
      const userWordsReady = user?.id
        ? Promise.all([
            queryClient.query({
              ...fsrsQueries.due(user.id),
              ...SPLASH_GATE,
              staleTime: 'static',
            }),
            queryClient.query({
              ...fsrsQueries.all(user.id),
              ...SPLASH_GATE,
              staleTime: 'static',
            }),
            queryClient.query({
              ...fsrsQueries.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
              ...SPLASH_GATE,
              staleTime: 'static',
            }),
          ])
        : null;
      // Awaited below; a handler now keeps an early failure from surfacing as an
      // unhandled rejection before that await is reached.
      userWordsReady?.catch(() => undefined);

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
        runWhenIdle(() => {
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
              .map(a => generateStorageUrl('images', a.image_url))
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
        runWhenIdle(() => {
          void (async () => {
            try {
              const readingList = await queryClient.query({
                ...readingProgressQueries.readingList(user.id),
                staleTime: 'static',
              });
              if (readingList.length > 0) {
                const imagePrefetches = readingList
                  .map(item => generateStorageUrl('images', item.articles.image_url))
                  .filter(Boolean)
                  .map(url =>
                    Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => null),
                  );

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
          })();
        });
      }

      // The user's FSRS data, started above alongside the critical queries.
      if (userWordsReady) {
        try {
          await userWordsReady;

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
            queryClient.query({ ...articleQueries.authors(), staleTime: 'static' }),
            queryClient.query({
              ...readingProgressQueries.readingList(user.id),
              staleTime: 'static',
            }),
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

      breadcrumb('preloader', 'App preload complete');
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
        await queryClient.query(articleQueries.detail(articleId));
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
        queryClient.query(fsrsQueries.all(user.id)),
        queryClient.query(
          fsrsQueries.due(user.id, DEFAULT_SESSION_COOLDOWN_HOURS, PRACTICE_DUE_WORDS_LIMIT),
        ),
      ]);
      return true;
    } catch (error) {
      void handleError(toError(error), { showToast: false });
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
