import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { useAuth } from '@/hooks/auth/useAuth';
import { wordManagementService } from '@/services/wordManagement';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

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
  handleWordDelete: (rootId: number) => Promise<void>;
  sortOption: DictionarySortOption;
  sortDirection: SortDirection;
  setSorting: (option: DictionarySortOption, direction?: SortDirection) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useDictionaryModal = ({
  studyWords,
}: UseDictionaryModalProps): UseDictionaryModalReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
          const textA = a.root?.letters || '';
          const textB = b.root?.letters || '';
          compareValue = textA.localeCompare(textB);
          break;
        }
        case 'dateAdded': {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          compareValue = dateA - dateB;
          break;
        }
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [studyWords, sortOption, sortDirection, searchQuery]);

  const handleWordDelete = useCallback(
    async (rootId: number) => {
      if (!user?.id) return;

      try {
        await wordManagementService.removeFromStudy(user.id, rootId);

        // Invalidate and refetch FSRS queries to update the UI
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) }),
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) }),
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(user.id) }),
        ]);
      } catch (error) {
        handleError(error as Error, {
          toastMessage: 'Failed to delete word from study list',
          sentrySeverity: 'error',
        });
      }
    },
    [user?.id, queryClient]
  );

  return {
    sortedWords,
    handleWordDelete,
    sortOption,
    sortDirection,
    setSorting,
    searchQuery,
    setSearchQuery,
  };
};
