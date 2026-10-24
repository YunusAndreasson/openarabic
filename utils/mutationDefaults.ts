import { mutationOptions, type QueryClient } from '@tanstack/react-query';

import { FSRS_BASE_KEY } from '@/constants/fsrs';
import { bookmarkService } from '@/services/bookmark';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { ArticleId, RootId } from '@/types/branded.types';
import type { FSRSWordUpdate } from '@/types/fsrs.types';
import type { StudyWordIntent } from '@/types/vocabulary.types';
import { managedRequest } from '@/utils/supabaseHelpers';

/** One review grade: the card's whole new FSRS state. */
export interface FSRSGradeVariables {
  userId: string;
  rootId: RootId;
  update: FSRSWordUpdate;
}

export interface StudyWordToggleVariables {
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

/** A review grade (`useFSRS`). */
export const fsrsGradeMutation = mutationOptions({
  mutationKey: [FSRS_BASE_KEY, 'grade'] as const,
  scope: { id: 'fsrs-grade' },
  mutationFn: ({ userId, rootId, update }: FSRSGradeVariables) =>
    studyWordsFSRSService.updateWordAndReview(userId, rootId, update, managedRequest()),
});

/** Saving or removing a word (`useStudyWordMutations`). */
export const studyWordToggleMutation = mutationOptions({
  mutationKey: ['study-words', 'toggle'] as const,
  scope: { id: 'study-word-toggle' },
  mutationFn: ({ userId, rootId, intent }: StudyWordToggleVariables) =>
    studyWordsFSRSService.setFSRSStudyRoot(userId, rootId, intent, managedRequest()),
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
  queryClient.setMutationDefaults(fsrsGradeMutation.mutationKey, fsrsGradeMutation);
  queryClient.setMutationDefaults(studyWordToggleMutation.mutationKey, studyWordToggleMutation);
  queryClient.setMutationDefaults(readingListAddMutation.mutationKey, readingListAddMutation);
  queryClient.setMutationDefaults(readingListRemoveMutation.mutationKey, readingListRemoveMutation);
}
