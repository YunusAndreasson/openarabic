import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fsrsQueries, gated } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * One saved word out of the study-word cache, or `undefined` if the learner has
 * not saved it.
 *
 * Reads the same `fsrsQueries.all` cache every other practice surface does, so a
 * word's state can never differ between the screen that saved it and the screen
 * that reports on it.
 *
 * The `select` is wrapped in `useCallback` on purpose, and it is not a React
 * Compiler violation: TanStack re-runs `select` whenever its identity changes,
 * so an inline arrow would recompute on every render. `useArabicWord` already
 * establishes the pattern for the same reason. `find` hands back the cached
 * object itself, so the result stays referentially stable across cache writes
 * that do not touch this word.
 */
export function useStudyWordByRoot(rootId: RootId | undefined): StudyWord | undefined {
  const { user } = useAuth();

  const selectWord = useCallback(
    (studyWords: StudyWord[]) =>
      rootId == null ? undefined : studyWords.find(studyWord => studyWord.root_id === rootId),
    [rootId],
  );

  const { data } = useQuery({
    ...gated(fsrsQueries.all, user?.id),
    select: selectWord,
  });

  return data;
}
