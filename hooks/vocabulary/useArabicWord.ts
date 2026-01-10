import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fsrsQueries } from '@/constants/queries';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
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
 */
export function useArabicWord({ word }: UseArabicWordProps): UseArabicWordReturn {
  const { user } = useAuth();

  // Get due words data - we use 0 as limit since we only need the due word IDs
  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  // Check if this word is due for review
  const isDueWord = word.root_id != null && dueWordRootIds.has(word.root_id);

  // CRITICAL: Use same query as useArticleWordInteractions for DRY consistency
  // Both underline state AND button state must use fsrsQueries.all() to stay in sync
  const { data: studyWords = [] } = useQuery({
    ...fsrsQueries.all(user?.id || ''),
    enabled: !!user?.id,
  });

  // Check if the word is directly selected (added to study words)
  // DRY: Uses same comparison logic as useArticleWordInteractions.ts line 145
  const directlySelected = useMemo(() => {
    if (!studyWords?.length || !word.root_id) return false;
    return studyWords.some((sw: StudyWord) => sw.root_id === word.root_id);
  }, [studyWords, word.root_id]);

  // Calculate final selection state, considering direct selection and due words
  const isSelected = directlySelected || isDueWord;

  return {
    isSelected,
  };
}
