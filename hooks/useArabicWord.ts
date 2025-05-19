import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocalSearchParams } from 'expo-router';

import { analytics } from '../services/analytics';
import { studyWordsService } from '../services/studyWords';
import { selectAudioState } from '../store/audioSlice';
import type { SentenceWord } from '../types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

import { useAuth } from './useAuth';
import { useArticlesByDueWords } from './useArticlesByDueWords';

export interface UseArabicWordProps {
  word: SentenceWord;
  position?: number;
  onPress?: (word: SentenceWord) => void;
}

export interface UseArabicWordReturn {
  isAudioHighlighted: boolean;
  isSelected: boolean;
  setForceSelected: (value: boolean | null) => void;
  handleSelectionChange: () => void;
}

/**
 * Hook to manage the state and behavior of an Arabic word in the UI
 */
export function useArabicWord({
  word,
  position,
  onPress,
}: UseArabicWordProps): UseArabicWordReturn {
  const { user } = useAuth();
  const [forceSelected, setForceSelected] = useState<boolean | null>(null);
  const audioState = useSelector(selectAudioState);

  // Get due words data - we use 0 as limit since we only need the due word IDs
  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  // Check if this word is due for review
  const isDueWord = word.root_id != null && dueWordRootIds.has(word.root_id);

  // Fetch the user's study words
  const { data: studyWords = [] } = useQuery({
    queryKey: ['study-words', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        return studyWordsService.getStudyWords(user.id);
      } catch (error) {
        handleError(
          error instanceof Error
            ? error
            : new Error('Error fetching study words'),
          {
            analyticsEventName: 'Study_Word_Fetch_Error',
            showToast: false,
            sentrySeverity: 'warning',
          }
        );
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Check if the word is directly selected (added to study words)
  const directlySelected = useMemo(() => {
    if (!studyWords?.length || !word.root_id) return false;
    return studyWords.some(sw => sw.root_id === word.root_id);
  }, [studyWords, word.root_id]);

  // Check if this word is currently being highlighted by audio player
  const isAudioHighlighted = useMemo(() => {
    if (position !== undefined && audioState.position !== null) {
      return audioState.wordId === word.id && audioState.position === position;
    }
    return audioState.wordId === word.id;
  }, [audioState.wordId, audioState.position, word.id, position]);

  // Calculate final selection state, considering force state, direct selection, and due words
  const isSelected = forceSelected !== null ? forceSelected : directlySelected || isDueWord;

  const handleSelectionChange = useCallback(() => {
    if (!user?.id || !onPress) return;

    // Analytics tracking - use ADD_STUDY_WORD or REMOVE_STUDY_WORD based on the selection state
    if (!directlySelected) {
      analytics.track('ADD_STUDY_WORD', {
        wordId: word.id,
        rootId: word.root_id,
      });
    } else {
      analytics.track('REMOVE_STUDY_WORD', {
        wordId: word.id,
        rootId: word.root_id,
      });
    }

    onPress(word);
  }, [user?.id, onPress, word, directlySelected]);

  return {
    isAudioHighlighted,
    isSelected,
    setForceSelected,
    handleSelectionChange,
  };
}
