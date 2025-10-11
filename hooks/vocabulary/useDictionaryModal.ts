import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { isDueWord, isLearnedWord, isMasteredWord } from '@/utils/wordClassification';

export type SortDirection = 'asc' | 'desc';

interface UseDictionaryModalProps {
  studyWords: StudyWord[];
}

interface UseDictionaryModalReturn {
  sortedWords: StudyWord[];
  sortDirection: SortDirection;
  setSorting: () => void;
}

export const useDictionaryModal = ({
  studyWords,
}: UseDictionaryModalProps): UseDictionaryModalReturn => {
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Toggle sort direction (always sorts by phase)
  const setSorting = useCallback(() => {
    setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  // Sort words by phase (Due > Learned > Mastered)
  const sortedWords = useMemo(() => {
    if (!studyWords?.length) return [];

    // Helper function to determine word phase priority
    // Due (0) > Learned (1) > Mastered (2) > Other (3)
    const getPhaseValue = (word: StudyWord): number => {
      if (isDueWord(word)) return 0; // Highest priority - needs review now
      if (isLearnedWord(word) && !isMasteredWord(word)) return 1; // Consolidating
      if (isMasteredWord(word)) return 2; // Well-established
      return 3; // New words not yet in system
    };

    const sorted = [...studyWords].sort((a, b) => {
      const phaseA = getPhaseValue(a);
      const phaseB = getPhaseValue(b);
      const compareValue = phaseA - phaseB;

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [studyWords, sortDirection]);

  return {
    sortedWords,
    sortDirection,
    setSorting,
  };
};
