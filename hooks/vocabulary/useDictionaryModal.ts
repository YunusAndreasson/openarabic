import { useCallback, useMemo, useState } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';

export type DictionarySortOption = 'difficulty' | 'alphabetical' | 'dateAdded';
export type SortDirection = 'asc' | 'desc';

export const DICTIONARY_SORT_OPTIONS = [
  { key: 'difficulty' as const, label: 'Difficulty' },
  { key: 'alphabetical' as const, label: 'A-Z' },
  { key: 'dateAdded' as const, label: 'Date Added' },
] as const;

interface UseDictionaryModalProps {
  studyWords: StudyWord[];
}

interface UseDictionaryModalReturn {
  sortedWords: StudyWord[];
  sortOption: DictionarySortOption;
  sortDirection: SortDirection;
  setSorting: (option: DictionarySortOption, direction?: SortDirection) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useDictionaryModal = ({
  studyWords,
}: UseDictionaryModalProps): UseDictionaryModalReturn => {
  const [sortOption, setSortOption] = useState<DictionarySortOption>('difficulty');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const setSorting = useCallback(
    (option: DictionarySortOption, direction?: SortDirection) => {
      setSortOption(prevOption => {
        const newOption = option;
        const newDirection =
          direction || (prevOption === option && sortDirection === 'desc' ? 'asc' : 'desc');
        setSortDirection(newDirection);
        return newOption;
      });
    },
    [sortDirection]
  );

  // Sort words based on selected option and direction
  const sortedWords = useMemo(() => {
    if (!studyWords?.length) return [];

    // First filter by search query
    const filteredWords = searchQuery.trim()
      ? studyWords.filter(word => {
          const arabicText = word.root?.letters?.toLowerCase() || '';
          const englishText = word.root?.meaning?.toLowerCase() || '';
          const query = searchQuery.toLowerCase().trim();

          return arabicText.includes(query) || englishText.includes(query);
        })
      : studyWords;

    // Then apply sorting
    const sorted = [...filteredWords].sort((a, b) => {
      let compareValue = 0;

      switch (sortOption) {
        case 'difficulty': {
          const diffA = a.fsrs_difficulty ?? 1.0;
          const diffB = b.fsrs_difficulty ?? 1.0;
          compareValue = diffA - diffB;
          break;
        }
        case 'alphabetical': {
          const textA = a.root?.meaning || '';
          const textB = b.root?.meaning || '';
          compareValue = textA.localeCompare(textB);
          break;
        }
        case 'dateAdded': {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          compareValue = dateA - dateB;
          break;
        }
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [studyWords, sortOption, sortDirection, searchQuery]);

  return {
    sortedWords,
    sortOption,
    sortDirection,
    setSorting,
    searchQuery,
    setSearchQuery,
  };
};
