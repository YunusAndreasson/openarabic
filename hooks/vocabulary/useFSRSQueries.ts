import { useQuery, useQueryClient } from '@tanstack/react-query';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';

interface UseFSRSQueriesOptions {
  userId: string | undefined;
  category?: 'learning' | 'mastered';
  limit?: number;
}

interface FSRSQueriesResult {
  allWords: StudyWord[] | undefined;
  dueWords: StudyWord[] | undefined;
  statsWords: StudyWord[] | undefined;
  filteredWords: StudyWord[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  invalidateAllQueries: () => void;
}

/**
 * Centralized hook for managing FSRS word queries
 * This hook provides access to all FSRS word data with proper caching and deduplication
 */
export function useFSRSQueries({
  userId,
  category,
  limit,
}: UseFSRSQueriesOptions): FSRSQueriesResult {
  const queryClient = useQueryClient();

  // Base query for all words - used as a foundation for other queries
  const allWordsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.all(userId) : ['fsrs-words'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return studyWordsFSRSService.getFSRSWords(userId, { forStats: false });
    },
    enabled: !!userId,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - study words change moderately
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData(FSRS_QUERY_KEYS.all(userId));
    },
  });

  // Query for due words - uses shorter stale time since it's more time-sensitive
  const dueWordsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.due(userId) : ['fsrs-words', 'due'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true, limit });
    },
    enabled: !!userId,
    ...CACHE_TIMES.SHORT, // 1 minute - due words change frequently
    // Use data from allWordsQuery if available and filter client-side
    initialData: () => {
      if (!userId) return undefined;
      const allWords = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(userId));
      if (allWords) {
        const now = new Date().toISOString();
        return allWords.filter(word => (word.fsrs_due ?? '9999-12-31') <= now).slice(0, limit);
      }
      return undefined;
    },
  });

  // Query for stats - can use longer cache times since stats update less frequently
  const statsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.stats(userId) : ['fsrs-words', 'stats'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return studyWordsFSRSService.getFSRSWords(userId, { forStats: true });
    },
    enabled: !!userId,
    staleTime: 600000, // 10 minutes - stats update less frequently
    gcTime: 1800000, // 30 minutes
    // Use data from allWordsQuery if available
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData(FSRS_QUERY_KEYS.all(userId));
    },
  });

  // Query for filtered words (by category) - uses moderate cache times
  const filteredWordsQuery = useQuery({
    queryKey:
      userId && category ? FSRS_QUERY_KEYS.filtered(userId, category) : ['fsrs-words', 'filtered'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return studyWordsFSRSService.getFSRSWords(userId, { category });
    },
    enabled: !!userId && !!category,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - filtered words change moderately
    // Use data from allWordsQuery if available
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData(FSRS_QUERY_KEYS.all(userId));
    },
  });

  // Function to invalidate all FSRS queries
  const invalidateAllQueries = () => {
    if (!userId) return;

    // Invalidate specific FSRS queries for this user
    queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(userId) });
    queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(userId) });
    queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(userId) });

    // Invalidate broader patterns for any remaining queries
    queryClient.invalidateQueries({ queryKey: ['fsrs-words'] });
    queryClient.invalidateQueries({ queryKey: ['studyWordsCounts', userId] });
    queryClient.invalidateQueries({ queryKey: ['vocabulary-stats'] });
  };

  return {
    allWords: allWordsQuery?.data,
    dueWords: dueWordsQuery?.data,
    statsWords: statsQuery?.data,
    filteredWords: filteredWordsQuery?.data,
    isLoading:
      allWordsQuery?.isLoading || dueWordsQuery?.isLoading || statsQuery?.isLoading || false,
    isFetching:
      allWordsQuery?.isFetching || dueWordsQuery?.isFetching || statsQuery?.isFetching || false,
    error: allWordsQuery?.error || dueWordsQuery?.error || statsQuery?.error,
    invalidateAllQueries,
  };
}
