import { writeReaderIntent } from '@/services/readerSaveRpc';
import { mutationOptions, type QueryClient } from '@tanstack/react-query';

import { FSRS_BASE_KEY } from '@/constants/fsrs';
import { QUERY_DEFAULTS, fsrsQueries, readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { bookmarkService } from '@/services/bookmark';
import {
  readingProgressService,
  type UpdateReadingProgressParams,
} from '@/services/readingProgress';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { ArticleId, RootId } from '@/types/branded.types';
import type { FSRSWordUpdate, GradePrecondition } from '@/types/fsrs.types';
import type { StudyWordIntent } from '@/types/vocabulary.types';
import { isNetworkFailure } from '@/utils/networkErrors';
import { isRetryableError, retryWhileOnline } from '@/utils/queryRetry';
import { managedRequest } from '@/utils/supabaseHelpers';

/** One review grade: the card's whole new FSRS state. */
export interface FSRSGradeVariables {
  expected?: GradePrecondition;
  userId: string;
  rootId: RootId;
  update: FSRSWordUpdate;
}

export interface StudyWordToggleVariables {
  readerIntent?: string;
  userId: string;
  rootId: RootId;
  /** Explicit direction from the UI the user acted on; omitted = legacy toggle */
  intent?: StudyWordIntent;
}

export interface ReadingListVariables {
  userId: string;
  articleId: ArticleId;
}

/*
 * The writes that must survive the app being killed while offline (a review
 * grade, a saved word, a playlist change), each defined ONCE: the hook that
 * fires the mutation spreads the same options object that is registered as its
 * default below, so the two cannot disagree on the key, the scope or the
 * mutationFn. (They were two hand-kept copies, with a comment asking that they
 * be kept in sync.)
 *
 * Each of these writes stores an absolute state — a grade writes the card's
 * whole FSRS state, a toggle adds or removes the row — so they must land in
 * the order they were made. TanStack only serializes mutations that share a
 * scope: without one, `resumePausedMutations` (on reconnect, or on restart
 * through the persisted cache) continues every paused write at once with
 * `Promise.all`. Three offline grades of one word (Forgot, then Knew it twice
 * in the drill) could then land in any order, the oldest state overwriting the
 * newest; an offline save-then-remove could end with the word saved.
 *
 * A scope runs its mutations one at a time, in the order they were made, and
 * is persisted with them — so the default also hands it to writes persisted by
 * a build that predates the scope.
 *
 * The keys are persisted with paused mutations too, so they never change.
 */

// These two idempotent writes can be replayed even if the server applied a
// request whose response was lost. TanStack backs off and pauses on disconnect.
const durableWriteRetry = (failures: number, error: Error): boolean =>
  isNetworkFailure(error) ||
  (failures < QUERY_DEFAULTS.MUTATION_MAX_RETRIES && isRetryableError(error));

export const readingProgressMutation = mutationOptions({
  mutationKey: ['reading-progress', 'update'] as const,
  meta: {
    persistPending: true,
    errorReport: { toastMessage: STRINGS.FAILED_TO_UPDATE_READING_PROGRESS },
  },
  mutationFn: async (variables: UpdateReadingProgressParams, { client }) => {
    await readingProgressService.updateProgress(variables, managedRequest());
    const { userId, articleId, lastSentenceRead, totalSentences } = variables;
    client.setQueryData(readingProgressQueries.bulk(userId).queryKey, current => {
      // A restored mutation may run before the full map has been fetched.
      if (!current) return undefined;
      const next = new Map(current);
      const existing = next.get(articleId);
      const now = new Date().toISOString();
      next.set(articleId, {
        article_id: articleId,
        user_id: userId,
        last_sentence_read: Math.min(
          totalSentences - 1,
          Math.max(existing?.last_sentence_read ?? 0, lastSentenceRead),
        ),
        total_sentences: totalSentences,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
      return next;
    });
  },
});

export function isPracticeGradeConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '40001';
}

/** A stale grade must never retry its frozen schedule, including after process death. */
export const fsrsGradeMutation = mutationOptions({
  mutationKey: [FSRS_BASE_KEY, 'grade'] as const,
  scope: { id: 'fsrs-grade' },
  retry: (count, error) =>
    !isPracticeGradeConflict(error) &&
    retryWhileOnline(QUERY_DEFAULTS.MUTATION_MAX_RETRIES)(count, error),
  mutationFn: async ({ userId, rootId, update, expected }: FSRSGradeVariables, { client }) => {
    try {
      await studyWordsFSRSService.updateWordAndReview(
        userId,
        rootId,
        update,
        managedRequest(),
        ...(expected ? [expected] : []),
      );
    } catch (error) {
      if (!isPracticeGradeConflict(error)) throw error;
      void fsrsQueries.invalidateAll(client, userId);
      throw Object.assign(new Error(STRINGS.FIRST_REVIEW_CONFLICT), { code: '40001' });
    }
  },
});

/** Saving or removing a word (`useStudyWordMutations`). */
export const studyWordToggleMutation = mutationOptions({
  mutationKey: ['study-words', 'toggle'] as const,
  scope: { id: 'study-word-toggle' },
  mutationFn: ({ userId, rootId, intent, readerIntent }: StudyWordToggleVariables) =>
    readerIntent
      ? writeReaderIntent(userId, rootId, readerIntent)
      : studyWordsFSRSService.setFSRSStudyRoot(userId, rootId, intent, managedRequest()),
});

/*
 * Adding an article to the playlist, and removing it (`useReadingListMutations`:
 * the reader's bookmark and the playlist's delete). One scope for both, since an
 * add and a remove of the same article must land in the order they were made.
 */
const READING_LIST_SCOPE = { id: 'reading-list' };

export const readingListAddMutation = mutationOptions({
  mutationKey: ['readingList', 'add'] as const,
  scope: READING_LIST_SCOPE,
  mutationFn: ({ userId, articleId }: ReadingListVariables) =>
    bookmarkService.addToReadingList(userId, articleId, managedRequest()),
});

export const readingListAddManyMutation = mutationOptions({
  mutationKey: ['readingList', 'addMany'] as const,
  scope: READING_LIST_SCOPE,
  meta: {
    persistPending: true,
    errorReport: { toastMessage: STRINGS.FAILED_TO_ADD_BEGINNER_ARTICLES },
  },
  mutationFn: async (
    { userId, articleIds }: { userId: string | undefined; articleIds: ArticleId[] },
    { client },
  ) => {
    if (!userId) throw new Error('User not authenticated');
    if (!articleIds.length) throw new Error('No beginner articles available');
    await bookmarkService.addManyToReadingList(userId, articleIds, managedRequest());
    // A restored write has no mounted hook to refresh the playlist.
    void readingProgressQueries.onListChanged(client, userId);
  },
});

export const readingListRemoveMutation = mutationOptions({
  mutationKey: ['readingList', 'remove'] as const,
  scope: READING_LIST_SCOPE,
  mutationFn: ({ userId, articleId }: ReadingListVariables) =>
    bookmarkService.removeFromReadingList(userId, articleId, managedRequest()),
});

/**
 * Registers the defaults above, keyed by each mutation's own `mutationKey`.
 *
 * `networkMode: 'online'` (the app-wide default, app/_layout.tsx) pauses such
 * a mutation instead of dropping it, and `utils/queryPersistence.ts` persists
 * paused mutations to disk so a restart can resume them. But `hydrate()` only
 * restores serializable state — a function can't survive the JSON round trip
 * — so a rehydrated mutation with no default fails immediately with "No
 * mutationFn found" (@tanstack/query-core) the moment `resumePausedMutations`
 * tries to re-run it. `PersistQueryClientProvider`'s restore effect runs on
 * first mount, so this must be called right after the QueryClient is
 * constructed — before any component (and before that restore effect) sees
 * it — not from inside a hook that may not have mounted yet.
 */
export function registerMutationDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(readingProgressMutation.mutationKey, {
    ...readingProgressMutation,
    retry: durableWriteRetry,
  });
  queryClient.setMutationDefaults(fsrsGradeMutation.mutationKey, fsrsGradeMutation);
  queryClient.setMutationDefaults(studyWordToggleMutation.mutationKey, studyWordToggleMutation);
  queryClient.setMutationDefaults(readingListAddMutation.mutationKey, readingListAddMutation);
  queryClient.setMutationDefaults(readingListAddManyMutation.mutationKey, {
    ...readingListAddManyMutation,
    retry: durableWriteRetry,
  });
  queryClient.setMutationDefaults(readingListRemoveMutation.mutationKey, readingListRemoveMutation);
}
