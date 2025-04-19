import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { analytics } from '../services/analytics';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { selectAudioState } from '../store/audioSlice';
import type { SentenceWord, StudyWord } from '../types/vocabulary.types';

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
  const { user } = useAuth();
  const [forceSelected, setForceSelected] = useState<boolean | null>(null);
  const audioState = useSelector(selectAudioState);

  const { data: studyWords } = useQuery<StudyWord[]>({
    queryKey: ['studyWords', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return studyWordsFSRSService.getFSRSWords(user.id);
    },
    enabled: !!user?.id,
  });

  const directlySelected = useMemo(() => {
    if (!studyWords?.length) return false;

    return studyWords.some(sw => sw.root_id === word.root_id);
  }, [studyWords, word.root_id]);

  const isAudioHighlighted = useMemo(() => {
    if (position !== undefined && audioState.position !== null) {
      return audioState.wordId === word.id && audioState.position === position;
    }
    return audioState.wordId === word.id;
  }, [audioState.wordId, audioState.position, word.id, position]);

  const isSelected = forceSelected ?? directlySelected;

  const handleSelectionChange = useCallback(() => {
    if (!user?.id || !word.id || !onPress) return;

    const analyticsData = {
      word: word.word_form,
      english: word.english,
      ...(word.sentence?.article_id && { articleId: word.sentence.article_id }),
    };

    const wordId = Number(word.id);

    if (isSelected) {
      analytics.trackAddStudyWord(wordId, analyticsData);
    } else {
      analytics.trackRemoveStudyWord(wordId, analyticsData);
    }
  }, [isSelected, user?.id, word, onPress]);

  useMemo(() => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  return {
    isAudioHighlighted,
    isSelected,
    setForceSelected,
  };
}
