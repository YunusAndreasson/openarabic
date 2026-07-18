import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

export type DictionarySortField = 'difficulty' | 'strength' | 'recent';
export type SortDirection = 'asc' | 'desc';

/** Direction applied when a field is first selected — the reading a learner wants most. */
const DEFAULT_DIRECTIONS: Record<DictionarySortField, SortDirection> = {
  difficulty: 'desc', // hardest first
  strength: 'asc', // weakest memory first
  recent: 'desc', // newest first
};

// Harakat, superscript alef, and tatweel — stripped so typing "كتب" matches "كَتَبَ"
const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;

function normalizeForSearch(text: string): string {
  return text.replace(ARABIC_DIACRITICS, '').toLowerCase();
}

function compareWords(a: StudyWord, b: StudyWord, field: DictionarySortField): number {
  switch (field) {
    case 'difficulty':
      return (a.fsrs_difficulty ?? 0) - (b.fsrs_difficulty ?? 0);
    case 'strength':
      return (a.fsrs_stability ?? 0) - (b.fsrs_stability ?? 0);
    case 'recent':
      return (
        (parseSupabaseTimestamp(a.created_at)?.getTime() ?? 0) -
        (parseSupabaseTimestamp(b.created_at)?.getTime() ?? 0)
      );
  }
}

interface UseDictionaryListProps {
  studyWords: StudyWord[];
}

interface UseDictionaryListReturn {
  /** Words after search filtering and sorting */
  words: StudyWord[];
  /** Word count before search filtering */
  totalCount: number;
  sortField: DictionarySortField;
  sortDirection: SortDirection;
  /** Select a sort field; re-selecting the active field flips its direction */
  selectSortField: (field: DictionarySortField) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useDictionaryList = ({
  studyWords,
}: UseDictionaryListProps): UseDictionaryListReturn => {
  const [sortField, setSortField] = useState<DictionarySortField>('difficulty');
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_DIRECTIONS.difficulty);
  const [searchQuery, setSearchQuery] = useState('');

  const selectSortField = useCallback(
    (field: DictionarySortField) => {
      if (field === sortField) {
        setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
        return;
      }
      setSortField(field);
      setSortDirection(DEFAULT_DIRECTIONS[field]);
    },
    [sortField],
  );

  const words = useMemo(() => {
    if (!studyWords?.length) return [];

    const query = normalizeForSearch(searchQuery.trim());
    const visible = query
      ? studyWords.filter(
          word =>
            normalizeForSearch(word.root?.meaning ?? '').includes(query) ||
            normalizeForSearch(word.root?.letters ?? '').includes(query),
        )
      : studyWords;

    const direction = sortDirection === 'asc' ? 1 : -1;
    // root_id tiebreak keeps equal-valued words (e.g. all-new, no FSRS state yet)
    // in a stable order across re-sorts
    return [...visible].sort(
      (a, b) => direction * compareWords(a, b, sortField) || a.root_id - b.root_id,
    );
  }, [studyWords, searchQuery, sortField, sortDirection]);

  return {
    words,
    totalCount: studyWords?.length ?? 0,
    sortField,
    sortDirection,
    selectSortField,
    searchQuery,
    setSearchQuery,
  };
};
