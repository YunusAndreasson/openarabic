import { useMemo } from 'react';

import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';
import { rankStrugglingWords } from '@/utils/leechUtils';

interface UseWordsToRevisitResult {
  leeches: StudyWord[];
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

  const leeches = useMemo(() => rankStrugglingWords(allWords ?? []), [allWords]);

  return {
    leeches,
    isLoading,
    isError: Boolean(error),
  };
}
