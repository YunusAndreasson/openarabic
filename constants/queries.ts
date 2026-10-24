/**
 * Unified query management with TanStack Query v5
 *
 * This file consolidates query keys and queryOptions into a single source of truth.
 * Each domain (fsrs, articles, readingProgress, audio) has:
 * - Query factories with co-located keys and options
 * - Invalidation helpers for bulk cache updates
 *
 * Benefits:
 * - Zero duplication between keys and options
 * - Type-safe query configuration
 * - Simplified cache invalidation (75% less code)
 * - Better IntelliSense and autocomplete
 * - Official TanStack Query v5 pattern
 *
 * Every queryFn hands its service a `managedRequest`, so a failure is reported
 * once by the query cache (app/_layout.tsx) after the last retry, not by the
 * service on every attempt. The heavy paged reads also pass TanStack's `signal`,
 * so a cancelled or superseded fetch stops downloading pages.
 */

import { queryOptions, skipToken, type QueryClient } from '@tanstack/react-query';

/**
 * Unique session identifier generated once per app launch.
 * Used to ensure featured articles are different each time the app is opened.
 * This is efficient because:
 * - No network calls are made (articles are already cached)
 * - Only affects client-side random selection from cached data
 * - Prevents stale featured articles from persisted cache
 */
export const APP_SESSION_ID = Date.now();

import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  FSRS_BASE_KEY,
  isSessionCooldownActive,
} from '@/constants/fsrs';
import { articlesService } from '@/services/articles';
import { buildReadingListTracks, READING_LIST_TRACKS_ERROR_REPORT } from '@/services/audioPlaylist';
import { authorsService } from '@/services/authors';
import { bookmarkService } from '@/services/bookmark';
import { categoriesService } from '@/services/categories';
import { readingProgressService } from '@/services/readingProgress';
import { rootEnrichmentService } from '@/services/rootEnrichment';
import {
  buildStudyHistory,
  calculateStreakFromDayKeys,
  StudySessionStreakService,
} from '@/services/studyStreak';
import { sentencesService } from '@/services/sentences';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { ArticleId, RootId } from '@/types/branded.types';
import type { AudioLanguage } from '@/types/enums';
import type { StudyWord } from '@/types/vocabulary.types';
import { MILLISECONDS_PER_DAY, MILLISECONDS_PER_HOUR } from '@/utils/dateTimeUtils';
import { filterDueWords } from '@/utils/newWordPacing';
import { retryWhileOnline } from '@/utils/queryRetry';
import { managedRequest } from '@/utils/supabaseHelpers';

/**
 * The query, or the same query disabled with `skipToken` unless `condition`
 * holds — for a gate beyond the signed-in user (see {@link gated}).
 *
 * The disabled query keeps the factory's key, so it still shows whatever that
 * cache entry already holds; only the fetch is withheld.
 */
export function skipUnless<TConfig extends { queryFn?: unknown }>(
  condition: boolean,
  config: TConfig,
): TConfig {
  return condition ? config : { ...config, queryFn: skipToken };
}

/**
 * A query that only runs once there is a signed-in user.
 *
 * Every user-scoped call site did this in two steps — build the config with
 * `user?.id ?? ''` so the key is stable, then swap the queryFn for `skipToken`
 * when the id is actually missing. Written out ten times, it was ten chances to
 * do one half and forget the other: pass the sentinel without the guard and the
 * query fires with an empty user id.
 *
 * Takes the factory rather than the built config so the sentinel and the guard
 * can never disagree about which id they were given.
 */
export function gated<TConfig extends { queryFn?: unknown }>(
  factory: (userId: string) => TConfig,
  userId: string | undefined,
): TConfig {
  return skipUnless(!!userId, factory(userId ?? ''));
}

/**
 * React Query configuration constants
 * Centralized cache times and query defaults for consistent data fetching
 */

/**
 * How long a persisted cache may be restored after it was written
 * (`utils/queryPersistence.ts`), and the app-wide `gcTime`. One value for both:
 * the persisted cache holds only what is still in memory, so a `gcTime` shorter
 * than the persister's `maxAge` would quietly cut every persisted entry short
 * (TanStack's persistQueryClient guidance). Two literals kept equal by a comment
 * was how that could drift.
 */
export const PERSISTED_CACHE_MAX_AGE_MS = 7 * MILLISECONDS_PER_DAY;

// Base query configuration defaults
export const QUERY_DEFAULTS = {
  STALE_TIME: 300000, // 5 minutes - default for most data
  GC_TIME: PERSISTED_CACHE_MAX_AGE_MS,
  MAX_RETRIES: 3,
  MUTATION_MAX_RETRIES: 2,
  MAX_RETRY_DELAY: 30000, // 30 seconds
} as const;

// Specialized cache times for different data types
export const CACHE_TIMES = {
  // For data that changes frequently (user study progress, due words)
  CRITICAL: {
    staleTime: 30000, // 30 seconds
    gcTime: 120000, // 2 minutes
  },
  // For user-specific data that changes moderately
  SHORT: {
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  },
  // For data that changes occasionally
  MEDIUM: {
    staleTime: 180000, // 3 minutes
    gcTime: 600000, // 10 minutes
  },
  // For articles (never update once written)
  ARTICLES: {
    staleTime: Infinity, // Articles never change once written
    gcTime: MILLISECONDS_PER_DAY,
  },
  // For categories and authors (never change)
  STATIC: {
    staleTime: Infinity, // Static data does not change; prevent re-fetches
    gcTime: 2 * MILLISECONDS_PER_DAY,
  },
  // Static review enrichment stays fresh for the lifetime of an app session.
  REVIEW_CHUNK: {
    staleTime: MILLISECONDS_PER_HOUR,
  },
} as const;

/**
 * Due-words fetch limit for the practice home screen. Shared by the screen's
 * query, its cache probe, and the startup prefetch so all three address the
 * exact same cache entry (the due key encodes the limit).
 */
export const PRACTICE_DUE_WORDS_LIMIT = 100;

/**
 * Session completion timestamp (client-only, never fetched from the server).
 *
 * Tagged through `queryOptions` so every `getQueryData`/`setQueryData` on it is
 * typed `number` without a generic at the call. Hoisted so the `due` queryFn
 * can read it without self-referencing `fsrsQueries` inside its own
 * initializer.
 */
const lastCompletedAt = (userId: string) =>
  queryOptions<number>({
    queryKey: [FSRS_BASE_KEY, userId, 'lastCompletedAt'],
    queryFn: skipToken,
  });

/**
 * FSRS vocabulary queries
 * Used across 15+ files for consistent FSRS word queries
 */
export const fsrsQueries = {
  /**
   * All FSRS words for a user (no filters, no cooldown)
   * Used for general word lists and statistics
   */
  all: (userId: string) =>
    queryOptions({
      queryKey: [FSRS_BASE_KEY, userId] as const,
      queryFn: ({ signal }) =>
        studyWordsFSRSService.getFSRSWords(userId, { forStats: false }, managedRequest(signal)),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      retry: retryWhileOnline(3),
    }),

  /**
   * All words with session cooldown filter
   * Used for capacity calculations and article selection
   */
  allWithCooldown: (userId: string, cooldownHours: number) =>
    queryOptions({
      queryKey: [FSRS_BASE_KEY, userId, 'all', 'cooldown', cooldownHours] as const,
      queryFn: ({ signal }) =>
        studyWordsFSRSService.getFSRSWords(
          userId,
          {
            forStats: true,
            sessionCooldownHours: cooldownHours,
            limit: 1000,
          },
          managedRequest(signal),
        ),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      retry: retryWhileOnline(3),
    }),

  /**
   * Due words only (time-sensitive)
   * Used for practice sessions and due word counts.
   *
   * Every input the queryFn uses is encoded in the key (`null` = not provided;
   * a `null` limit means unlimited), so differently-parameterized consumers get
   * distinct cache entries instead of racing over one. This is the SINGLE
   * queryFn for due words — call sites must not attach their own (beyond the
   * skipToken guard for missing userId).
   *
   * The cooldown is conditional: it only filters recently-reviewed words while
   * the last completed session (lastCompletedAtKey) is still inside the
   * cooldown window. Outside that window no cooldown is applied, so words in
   * short relearning steps reappear on time.
   */
  due: (userId: string, sessionCooldownHours?: number, limit?: number) =>
    queryOptions({
      queryKey: [
        FSRS_BASE_KEY,
        userId,
        'due',
        sessionCooldownHours ?? null,
        limit ?? null,
      ] as const,
      queryFn: ({ client, signal }) => {
        const recentlyCompleted =
          sessionCooldownHours !== undefined &&
          isSessionCooldownActive(
            client.getQueryData(lastCompletedAt(userId).queryKey),
            sessionCooldownHours,
            Date.now(),
          );

        return studyWordsFSRSService.getFSRSWords(
          userId,
          {
            onlyDue: true,
            ...(recentlyCompleted ? { sessionCooldownHours } : {}),
            ...(limit !== undefined ? { limit } : {}),
          },
          managedRequest(signal),
        );
      },
      enabled: !!userId,
      ...CACHE_TIMES.SHORT,
      retry: retryWhileOnline(2),
    }),

  /**
   * Query key for session completion timestamp (client-only, not fetched from server)
   * Used to temporarily apply cooldown after completing a review session
   */
  lastCompletedAtKey: (userId: string) => lastCompletedAt(userId).queryKey,

  /**
   * Prefix matching every due-words cache entry regardless of its
   * cooldown/limit variant (both are encoded in the key). For cache-only
   * reads that need "any" due list, e.g. the add-gate backlog check.
   */
  duePrefix: (userId: string) => [FSRS_BASE_KEY, userId, 'due'] as const,

  /**
   * Invalidate all FSRS queries for a user
   * Use after: completing practice session, adding/removing words
   *
   * No predicate is needed to spare the disabled (`skipToken`) entries:
   * TanStack 5's refetch already skips disabled queries.
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return queryClient.invalidateQueries({ queryKey: [FSRS_BASE_KEY, userId] });
  },
} as const;

/**
 * The due list as the cached full word list implies it — available before the
 * due query's own request lands, through the same filter the server applies
 * (`filterDueWords`). `undefined` while the word list itself is not cached.
 *
 * Read by the due query's placeholder (useFSRSQueries) and by the add gate's
 * backlog check (useStudyWordMutations), which used to compute it separately.
 */
export function estimateDueWordsFromCache(
  queryClient: QueryClient,
  userId: string,
  nowMs: number,
): StudyWord[] | undefined {
  const allWords = queryClient.getQueryData(fsrsQueries.all(userId).queryKey);
  if (!allWords) return undefined;

  return filterDueWords(allWords, {
    lastCompletedAt: queryClient.getQueryData(lastCompletedAt(userId).queryKey),
    cooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
    nowMs,
  });
}

/**
 * Article queries (articles, categories, authors)
 * Used across 10+ files for library and reading
 */
export const articleQueries = {
  /**
   * All articles (never change once written, infinite staleTime)
   * Used for library display and filtering
   */
  all: () =>
    queryOptions({
      queryKey: ['articles'] as const,
      queryFn: ({ signal }) => articlesService.getArticles(managedRequest(signal)),
      ...CACHE_TIMES.ARTICLES, // Infinity staleTime
      retry: retryWhileOnline(3),
      placeholderData: old => old,
    }),

  /**
   * Single article details by ID
   * Used for article reader and prefetching. No id (a reader route without a
   * valid one) is `skipToken`.
   */
  detail: (articleId: ArticleId | undefined) =>
    queryOptions({
      queryKey: ['article', articleId] as const,
      queryFn: articleId
        ? () => articlesService.getArticleById(articleId, managedRequest())
        : skipToken,
      ...CACHE_TIMES.ARTICLES, // Infinity staleTime
      retry: retryWhileOnline(2),
      placeholderData: old => old,
    }),

  /**
   * Articles with word statistics
   * Used for capacity-based recommendations
   */
  withStats: () =>
    queryOptions({
      queryKey: ['articles', 'with-word-stats'] as const,
      queryFn: ({ signal }) => articlesService.getArticlesWithWordStats(managedRequest(signal)),
      ...CACHE_TIMES.ARTICLES,
      retry: retryWhileOnline(3),
    }),

  /**
   * Every sentence in the library, folded into the search index that backs
   * searching the texts by their contents.
   *
   * Fetched only when the search screen mounts, so it costs nothing at cold
   * start. Not persisted — the `articles` prefix is excluded from
   * `PERSIST_KEYS` (`utils/queryPersistence.ts`), which is what we want for a
   * ~1 MB payload on Android.
   */
  searchCorpus: () =>
    queryOptions({
      queryKey: ['articles', 'search-corpus'] as const,
      queryFn: ({ signal }) => articlesService.getSearchCorpus(managedRequest(signal)),
      ...CACHE_TIMES.ARTICLES, // Sentences never change (infinite staleTime)
      retry: retryWhileOnline(2),
    }),

  /**
   * All categories (static, rarely change)
   * Used for filter sections and navigation
   */
  categories: () =>
    queryOptions({
      queryKey: ['categories'] as const,
      queryFn: () => categoriesService.getCategories(managedRequest()),
      ...CACHE_TIMES.STATIC, // 48 hours
      retry: retryWhileOnline(3),
    }),

  /**
   * All unique authors (static, rarely change)
   * Used for filter sections and navigation
   */
  authors: () =>
    queryOptions({
      queryKey: ['authors'] as const,
      queryFn: () => authorsService.getUniqueAuthors(managedRequest()),
      ...CACHE_TIMES.STATIC, // 48 hours
      retry: retryWhileOnline(3),
    }),

  /**
   * Invalidate all article-related data
   * Use after: data refresh, pull-to-refresh
   */
  invalidateAll: (queryClient: QueryClient) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['articles'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['authors'] }),
    ]);
  },
} as const;

/**
 * A featured-articles pick, cached client-side for the session — never
 * fetched. Only the articles are kept: they are all any consumer reads.
 */
export interface FeaturedSelection {
  articles: Article[];
}

/**
 * Featured-article picks, one cache entry per scope and refresh. APP_SESSION_ID
 * in the key gives every app launch a fresh pick; tagged so reads and writes
 * of the entry are typed without a generic.
 */
export const featuredQueries = {
  selection: (scope: string, refreshKey: number) =>
    queryOptions<FeaturedSelection>({
      queryKey: ['featured-articles', scope, refreshKey, APP_SESSION_ID],
      queryFn: skipToken,
    }),
} as const;

/**
 * Reading list and progress queries
 * Used for bookmarks and reading streaks
 */
export const readingProgressQueries = {
  /**
   * Reading list (bookmarks) for a user
   * Used for bookmark management, audio playlists, and — through a `select` —
   * whether one article is saved (see useArticleData)
   */
  readingList: (userId: string) =>
    queryOptions({
      queryKey: ['readingList', userId] as const,
      queryFn: () => bookmarkService.getReadingList(userId, managedRequest()),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      retry: retryWhileOnline(2),
      placeholderData: [],
    }),

  /**
   * Bulk reading progress for a user
   * Single shared cache for all reading progress
   *
   * Refreshed by invalidation, pull-to-refresh and the startup preload — not
   * on mount (the app-wide default) and not on reconnect.
   */
  bulk: (userId: string) =>
    queryOptions({
      queryKey: ['reading-progress-bulk', userId] as const,
      queryFn: ({ signal }) =>
        readingProgressService.getBulkProgress(userId, managedRequest(signal)),
      enabled: !!userId,
      staleTime: 10000, // 10 seconds
      gcTime: MILLISECONDS_PER_DAY,
      refetchOnReconnect: false,
      placeholderData: new Map(),
    }),

  /**
   * Invalidate all reading-related queries for a user
   * Use after: adding/removing bookmarks, completing articles
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['readingList', userId] }),
      queryClient.invalidateQueries({ queryKey: ['reading-progress-bulk', userId] }),
    ]);
  },

  /**
   * Refresh everything the reading list feeds after it changes — an article
   * saved or removed, from anywhere. The list itself (and so every saved-state
   * `select` of it) and the audio tracks built from it, in every audio
   * language. Three hand-written copies of this had drifted: one refreshed
   * only the current language's tracks, one wrote its keys inline.
   */
  onListChanged: (queryClient: QueryClient, userId: string) => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['readingList', userId] }),
      queryClient.invalidateQueries({ queryKey: ['enhancedAudioTracks', userId] }),
    ]);
  },
} as const;

/**
 * Audio queries
 * Used for audio playlists and playback
 */
export const audioQueries = {
  /**
   * Enhanced audio tracks for reading list
   * Used for audio playback with language preference
   *
   * Built from the reading list's own cache entry (`client.query` dedupes onto
   * it, and fetches only when it is stale), not a second download of the list.
   */
  tracks: (userId: string, audioPreference: AudioLanguage) =>
    queryOptions({
      queryKey: ['enhancedAudioTracks', userId, audioPreference] as const,
      queryFn: async ({ client }) =>
        buildReadingListTracks(
          await client.query(readingProgressQueries.readingList(userId)),
          audioPreference,
        ),
      enabled: !!userId,
      ...CACHE_TIMES.MEDIUM,
      placeholderData: [],
      // A reading-list failure is reported by the reading-list query itself;
      // this names the playlist failure once more, without a toast.
      meta: {
        errorReport: { ...READING_LIST_TRACKS_ERROR_REPORT, analyticsProperties: { userId } },
      },
    }),

  /**
   * Invalidate audio tracks
   * Use after: reading list changes, audio preference changes
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return queryClient.invalidateQueries({ queryKey: ['enhancedAudioTracks', userId] });
  },
} as const;

/**
 * Every LOCAL day the user reviewed a word — the one paged scan behind both the
 * streak and its history. Shared so the scan runs once for both, and one
 * invalidation refreshes both.
 */
const studyDays = (userId: string) =>
  queryOptions({
    queryKey: ['study-streak', userId] as const,
    queryFn: ({ signal }) =>
      StudySessionStreakService.fetchStudyDayKeys(userId, managedRequest(signal)),
    enabled: !!userId,
    ...CACHE_TIMES.CRITICAL, // 30 seconds (time-sensitive)
    retry: retryWhileOnline(2),
  });

/**
 * Study streak queries
 * Used for vocabulary practice streak tracking
 */
export const studyStreakQueries = {
  studyDays,

  /**
   * Current study streak metrics
   * Used for displaying streak count and motivation
   */
  streak: (userId: string) =>
    queryOptions({
      ...studyDays(userId),
      select: calculateStreakFromDayKeys,
    }),

  /**
   * Study streak history with daily activity data
   * Used for visualization charts and detailed metrics
   */
  history: (userId: string, days: number = 40) =>
    queryOptions({
      ...studyDays(userId),
      select: (dayKeys: Set<string>) => buildStudyHistory(dayKeys, days),
      refetchOnMount: 'always', // Always refetch when chart opens to show fresh data
    }),

  /**
   * Invalidate all study streak queries for a user
   * Use after: completing practice session, manual streak updates
   */
  invalidateAll: (queryClient: QueryClient, userId: string) => {
    return queryClient.invalidateQueries({ queryKey: studyDays(userId).queryKey });
  },
} as const;

/**
 * Sentence queries
 * Used for fetching sentences containing specific words
 */
export const sentenceQueries = {
  /**
   * Sentences containing a specific word (by root_id), easiest usage first and
   * each carrying the article it came from.
   *
   * Used for the word detail screen's examples. Ranked rather than arbitrary
   * because the infinite staleTime means whatever comes back first is what that
   * word shows from then on.
   */
  byRootId: (rootId: RootId, limit = 5) =>
    queryOptions({
      queryKey: ['sentences', 'by-root', rootId, limit] as const,
      queryFn: () => sentencesService.getSentencesByRootId(rootId, limit, managedRequest()),
      ...CACHE_TIMES.ARTICLES, // Sentences never change (infinite staleTime)
      enabled: !!rootId,
      retry: retryWhileOnline(2),
    }),
} as const;

/**
 * Root enrichment queries
 * The synthesised "where this word comes from" explanation for one headword.
 */
export const rootEnrichmentQueries = {
  /**
   * One headword's root explanation, or `null` when none has been generated.
   *
   * STATIC rather than ARTICLES: both are `staleTime: Infinity`, but this is
   * reference content keyed to the dictionary, not article text.
   *
   * Deliberately NOT added to `PERSIST_KEYS` in utils/queryPersistence.ts. That
   * layer already excludes `articles` because Android's CursorWindow caps a read
   * at ~2MB, and this cache grows with every word a learner opens — unbounded,
   * where the persisted set has to stay small and predictable.
   */
  detail: (rootId: RootId | undefined) =>
    queryOptions({
      queryKey: ['root-enrichment', rootId] as const,
      queryFn: rootId
        ? () => rootEnrichmentService.getByRootId(rootId, managedRequest())
        : skipToken,
      ...CACHE_TIMES.STATIC,
      retry: retryWhileOnline(1),
    }),
} as const;

/** One immutable review batch: its roots, and the signature its key is named by. */
interface ReviewChunkInput {
  rootIds: RootId[];
  keySignature: string;
}

/**
 * What every review-chunk query shares.
 *
 * Each feeds the card something it can do without — an example sentence, wider
 * accepted answers for voice grading, a root story — so a failure is silent (no
 * toast, no report: the card simply omits the block) and is not retried:
 * retrying costs a session more requests than the feature is worth.
 */
const REVIEW_CHUNK_OPTIONS = {
  ...CACHE_TIMES.REVIEW_CHUNK,
  retry: false,
  meta: { silent: true },
} as const;

/**
 * Review-session enrichment, one bounded query per immutable scheduler batch so
 * the per-card path makes no network call at all (the review lane's rule — a
 * warm session makes zero, and the debug HUD turns red when it doesn't). An
 * empty batch is `skipToken`.
 */
export const reviewChunkQueries = {
  /** One example sentence per root; see `sentencesService.getExamplesForRoots`. */
  examples: ({ rootIds, keySignature }: ReviewChunkInput) =>
    queryOptions({
      queryKey: ['review', 'examples', keySignature] as const,
      queryFn:
        rootIds.length > 0
          ? () => sentencesService.getExamplesForRoots(rootIds, managedRequest())
          : skipToken,
      ...REVIEW_CHUNK_OPTIONS,
    }),

  /** Every corpus gloss per root; see `sentencesService.getGlossAlternatesForRoots`. */
  glossAlternates: ({ rootIds, keySignature }: ReviewChunkInput) =>
    queryOptions({
      queryKey: ['review', 'glossAlternates', keySignature] as const,
      queryFn:
        rootIds.length > 0
          ? ({ signal }) =>
              sentencesService.getGlossAlternatesForRoots(rootIds, managedRequest(signal))
          : skipToken,
      ...REVIEW_CHUNK_OPTIONS,
    }),

  /** The root story per root; see `rootEnrichmentService.getByRootIds`. */
  rootEnrichments: ({ rootIds, keySignature }: ReviewChunkInput) =>
    queryOptions({
      queryKey: ['review', 'rootEnrichments', keySignature] as const,
      queryFn:
        rootIds.length > 0
          ? () => rootEnrichmentService.getByRootIds(rootIds, managedRequest())
          : skipToken,
      ...REVIEW_CHUNK_OPTIONS,
    }),
} as const;
