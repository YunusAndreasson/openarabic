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
