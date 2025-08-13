import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

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
    queryKey: user?.id
      ? FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS)
      : FSRS_QUERY_KEYS.FALLBACK.allWithCooldown(DEFAULT_SESSION_COOLDOWN_HOURS),
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        return studyWordsFSRSService.getFSRSWords(user.id, { forStats: false });
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Error fetching study words'), {
          analyticsEventName: 'Study_Word_Fetch_Error',
          showToast: false,
          sentrySeverity: 'warning',
        });
        return [];
      }
    },
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
