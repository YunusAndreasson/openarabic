import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { analytics } from '../services/analytics';
import type { RootState } from '../store/store';
import type { SentenceWord } from '../types/vocabulary.types';

import { useAuth } from './useAuth';

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [forceSelected, setForceSelected] = useState<boolean | null>(null);

  // Get audio state with robust selector
  const audioState = useSelector((state: RootState) => ({
    wordId: state.audio.currentWordId,
    position: state.audio.currentPosition,
    isPlaying: state.audio.isPlaying,
  }));

  // Selection state management
  const studyWords = queryClient.getQueryData(['studyWords', user?.id]);
  const directlySelected = useMemo(() => {
    if (!studyWords || !Array.isArray(studyWords)) return false;
    const wordId = word.id;
    return studyWords.some(sw => {
      const swId = sw.sentence_word_id;
      return swId === wordId || String(swId) === String(wordId);
    });
  }, [studyWords, word.id]);

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
