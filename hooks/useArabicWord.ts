import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { analytics } from '../services/analytics';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { selectAudioState } from '../store/audioSlice';
import type { SentenceWord, StudyWord } from '../types/vocabulary.types';

import { useAuth } from './useAuth';

// Define an extended type to handle legacy study words that might have sentence_word_id
interface ExtendedStudyWord extends StudyWord {
  sentence_word_id?: number;
}

export interface UseArabicWordProps {
  word: SentenceWord;
  position?: number;
  onPress?: (word: SentenceWord) => void;
}

export interface UseArabicWordReturn {
  isAudioHighlighted: boolean;
  isSelected: boolean;
  setForceSelected: (value: boolean | null) => void;
}

export function useArabicWord({
  word,
  position,
  onPress,
}: UseArabicWordProps): UseArabicWordReturn {
  const { user } = useAuth();
  const [forceSelected, setForceSelected] = useState<boolean | null>(null);

  // Use the memoized selector instead of creating a new object
  const audioState = useSelector(selectAudioState);

  // Use useQuery with a proper queryFn to ensure we have the most up-to-date data
  const { data: studyWords } = useQuery<ExtendedStudyWord[]>({
    queryKey: ['studyWords', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return studyWordsFSRSService.getFSRSWords(user.id) as Promise<ExtendedStudyWord[]>;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data
  });

  // Selection state management
  const directlySelected = useMemo(() => {
    if (!studyWords || !Array.isArray(studyWords)) return false;
    const wordId = word.id;

    // Check if the word is directly selected - accounting for both old and new formats
    const isDirectlySelected = studyWords.some(sw => {
      // Check for sentence_word_id (legacy format)
      if (sw.sentence_word_id !== undefined) {
        return sw.sentence_word_id === wordId || String(sw.sentence_word_id) === String(wordId);
      }
      return false;
    });

    // Also check if the word's root is selected
    const isRootSelected = studyWords.some(sw => {
      return sw.root_id === word.root_id;
    });

    return isDirectlySelected || isRootSelected;
  }, [studyWords, word.id, word.root_id]);

  // Audio highlight state
  const isAudioHighlighted = useMemo(() => {
    if (position !== undefined && audioState.position !== null) {
      return audioState.wordId === word.id && audioState.position === position;
    }
    return audioState.wordId === word.id;
  }, [audioState.wordId, audioState.position, word.id, position]);

  // Selection state
  const isSelected = forceSelected !== null ? forceSelected : directlySelected;

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (user && word.id && onPress) {
      const wordId = typeof word.id === 'string' ? parseInt(word.id, 10) : word.id;

      if (isSelected) {
        analytics.trackAddStudyWord(wordId, {
          word: word.word_form,
          english: word.english,
          ...(word.sentence?.article_id && { articleId: word.sentence.article_id }),
        });
      } else {
        analytics.trackRemoveStudyWord(wordId, {
          word: word.word_form,
          english: word.english,
        });
      }
    }
  }, [isSelected, user, word, onPress]);

  // Update analytics when selection changes
  useMemo(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  return {
    isAudioHighlighted,
    isSelected,
    setForceSelected,
  };
}
