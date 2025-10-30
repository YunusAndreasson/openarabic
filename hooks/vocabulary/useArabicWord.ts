import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

export interface UseArabicWordProps {
  word: SentenceWord;
  position?: number;
}

export interface UseArabicWordReturn {
  isSelected: boolean;
}

/**
 * Hook to manage the state and behavior of an Arabic word in the UI
 */
export function useArabicWord({
  word,
  position: _position,
}: UseArabicWordProps): UseArabicWordReturn {
  const { user } = useAuth();

  // Get due words data - we use 0 as limit since we only need the due word IDs
  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  // Check if this word is due for review
  const isDueWord = word.root_id != null && dueWordRootIds.has(word.root_id);

  // Fetch the user's study words using unified FSRS query keys so mutations invalidate consistently
  const { data: studyWords = [] } = useQuery({
    ...fsrsQueries.allWithCooldown(user?.id || '', DEFAULT_SESSION_COOLDOWN_HOURS),
    enabled: !!user?.id,
  });

  // Check if the word is directly selected (added to study words)
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
