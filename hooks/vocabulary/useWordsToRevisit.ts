import { useMemo } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';
import { isLeechWord, rankStrugglingWords } from '@/utils/leechUtils';

interface UseWordsToRevisitResult {
  /** The ranked top slice — at most `LEECH_LIST_LIMIT`. */
  leeches: StudyWord[];
  /**
   * How many leeches there actually are.
   *
   * Separate from `leeches.length` because the list is capped and the truth is
   * not. The practice tile already learned this the hard way — counting with
   * `rankStrugglingWords` told a learner with 47 leeches that they had 20 — and
   * the sheet had the same hole one level down: twenty rows, no sign that
   * anything was missing, and no way to reach the rest.
   */
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Surfaces the user's "words to revisit" (leeches) — the studied words they
 * forget most, ranked by lapses then difficulty. Reuses the shared FSRS word
 * cache (no extra network round-trip) and applies the pure `rankStrugglingWords`
 * ranking client-side.
 */
export function useWordsToRevisit(): UseWordsToRevisitResult {
  const { user } = useAuth();
  const { allWords, isLoading, error } = useFSRSQueries({ userId: user?.id });

  // Filtered ONCE, then counted and ranked off the same array. `allWords` pages
  // the whole table for a heavy account, and `rankStrugglingWords` runs this very
  // predicate internally before throwing the length away — so counting
  // separately walked every word twice with the same test, and gave the
  // `Array.filter` index-as-`minLapses` footgun a second site to be
  // reintroduced at. The arrow wrapper below is that footgun: `filter` passes the
  // index as a second argument, which lands on `isLeechWord`'s `minLapses` and
  // makes every word at index 0/1 a leech. Same trap as `useDictionaryList`.
  const { leeches, totalCount } = useMemo(() => {
    const struggling = (allWords ?? []).filter(word => isLeechWord(word));
    return { leeches: rankStrugglingWords(struggling), totalCount: struggling.length };
  }, [allWords]);

  return {
    leeches,
    totalCount,
    isLoading,
    isError: Boolean(error),
  };
}
