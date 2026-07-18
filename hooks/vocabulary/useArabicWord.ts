import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fsrsQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

export interface UseArabicWordProps {
  word: SentenceWord;
}

export interface UseArabicWordReturn {
  isSelected: boolean;
}

/**
 * Hook to manage the state and behavior of an Arabic word in the UI
 * IMPORTANT: Uses same query as WordDetailsBottomSheet button state for consistency
 *
 * Every rendered word mounts this hook, so both queries subscribe with a
 * narrow boolean `select`: the component only re-renders when THIS word's
 * membership flips, not on every study-word cache update.
 */
export function useArabicWord({ word }: UseArabicWordProps): UseArabicWordReturn {
  const { user } = useAuth();
  const rootId = word.root_id;

  const selectHasRoot = useCallback(
    (studyWords: StudyWord[]) =>
      rootId != null && studyWords.some(studyWord => studyWord.root_id === rootId),
    [rootId],
  );

  // CRITICAL: Use same query as useArticleWordInteractions for DRY consistency
  // Both underline state AND button state must use fsrsQueries.all() to stay in sync
  const allConfig = fsrsQueries.all(user?.id ?? '');
  const { data: isInStudyList = false } = useQuery({
    ...allConfig,
    queryFn: user?.id ? allConfig.queryFn : skipToken,
    select: selectHasRoot,
  });

  // Due words are a subset of all study words; subscribing to the due query as
  // well only makes the underline appear earlier while `all` is still loading.
  const dueConfig = fsrsQueries.due(user?.id ?? '');
  const { data: isDueWord = false } = useQuery({
    ...dueConfig,
    queryFn: user?.id ? dueConfig.queryFn : skipToken,
    select: selectHasRoot,
  });

  return {
    isSelected: isInStudyList || isDueWord,
  };
}
