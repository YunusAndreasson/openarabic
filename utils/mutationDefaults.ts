import type { QueryClient } from '@tanstack/react-query';

import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import type { FSRSWordUpdate } from '@/types/fsrs.types';
import type { StudyWordIntent } from '@/types/vocabulary.types';

/** Keyed to `useFSRS.ts`'s grade mutation — keep the two in sync. */
export const FSRS_GRADE_MUTATION_KEY = ['fsrs-words', 'grade'] as const;
/** Keyed to `useStudyWordMutations.ts`'s add/remove toggle — keep the two in sync. */
export const STUDY_WORD_TOGGLE_MUTATION_KEY = ['study-words', 'toggle'] as const;

/**
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
 * is persisted with them. Set on both the hooks and the defaults below, so
 * writes persisted by a build that predates the scope get it on restore too.
 */
export const FSRS_GRADE_MUTATION_SCOPE = { id: 'fsrs-grade' };
export const STUDY_WORD_TOGGLE_MUTATION_SCOPE = { id: 'study-word-toggle' };

/**
 * Registers a `mutationFn` default for every mutation whose write must
 * survive the app being killed while offline (a review grade, a saved word).
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
  queryClient.setMutationDefaults(FSRS_GRADE_MUTATION_KEY, {
    scope: FSRS_GRADE_MUTATION_SCOPE,
    mutationFn: ({
      userId,
      rootId,
      update,
    }: {
      userId: string;
      rootId: RootId;
      update: FSRSWordUpdate;
    }) => studyWordsFSRSService.updateWordAndReview(userId, rootId, update),
  });

  queryClient.setMutationDefaults(STUDY_WORD_TOGGLE_MUTATION_KEY, {
    scope: STUDY_WORD_TOGGLE_MUTATION_SCOPE,
    mutationFn: ({
      userId,
      rootId,
      intent,
    }: {
      userId: string;
      rootId: RootId;
      intent?: StudyWordIntent;
    }) => studyWordsFSRSService.setFSRSStudyRoot(userId, rootId, intent),
  });
}
