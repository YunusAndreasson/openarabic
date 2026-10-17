import { useQuery } from '@tanstack/react-query';

import { fsrsQueries, gated } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

/**
 * The roots among one sentence's words that are in the user's study list: the
 * words that carry the "saved" marker.
 *
 * One subscription per sentence, not per word. The `select` returns only this
 * sentence's saved roots, sorted, and TanStack shares that array structurally,
 * so the sentence re-renders only when one of its own words is saved or
 * removed — not on every study-word cache update.
 *
 * Uses the same queries as the word sheet's add button (`fsrsQueries.all`), so
 * the marker and the button always agree. The due query is a subset of `all`;
 * subscribing to it as well only shows the marker earlier while `all` is still
 * loading.
 */
export function useSentenceSelectedRoots(words: readonly SentenceWord[]): ReadonlySet<number> {
  const { user } = useAuth();
  const sentenceRoots = new Set<RootId>(words.map(word => word.root_id));

  const selectSentenceRoots = (studyWords: StudyWord[]): number[] =>
    [
      ...new Set(
        studyWords
          .filter(studyWord => sentenceRoots.has(studyWord.root_id))
          .map(studyWord => studyWord.root_id),
      ),
    ].sort((a, b) => a - b);

  const { data: studyRoots } = useQuery({
    ...gated(fsrsQueries.all, user?.id),
    select: selectSentenceRoots,
  });
  const { data: dueRoots } = useQuery({
    ...gated(fsrsQueries.due, user?.id),
    select: selectSentenceRoots,
  });

  return new Set([...(studyRoots ?? []), ...(dueRoots ?? [])]);
}
