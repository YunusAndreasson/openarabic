import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';

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
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Toggle sort direction (always sorts by memory strength/stability)
  const setSorting = useCallback(() => {
    setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  // Sort words by memory strength (stability) - matches progress bar visual
  const sortedWords = useMemo(() => {
    if (!studyWords?.length) return [];

    const sorted = [...studyWords].sort((a, b) => {
      const stabilityA = a.fsrs_stability ?? 0;
      const stabilityB = b.fsrs_stability ?? 0;
      const compareValue = stabilityA - stabilityB;

      // asc = weakest first (0 → 10), desc = strongest first (10 → 0)
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
