import { useQuery, useQueryClient } from '@tanstack/react-query';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';

interface UseFSRSQueriesOptions {
  userId: string | undefined;
  limit?: number;
}

interface FSRSQueriesResult {
  allWords: StudyWord[] | undefined;
  dueWords: StudyWord[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
}

/**
 * Centralized hook for managing FSRS word queries
 * This hook provides access to all FSRS word data with proper caching and deduplication
 */
export function useFSRSQueries({ userId, limit }: UseFSRSQueriesOptions): FSRSQueriesResult {
  const queryClient = useQueryClient();

  // Base query for all words - used as a foundation for other queries
  const allWordsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.all(userId) : FSRS_QUERY_KEYS.FALLBACK.all,
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
    queryKey: userId ? FSRS_QUERY_KEYS.due(userId) : FSRS_QUERY_KEYS.FALLBACK.due,
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
    queryKey: userId ? FSRS_QUERY_KEYS.stats(userId) : FSRS_QUERY_KEYS.FALLBACK.stats,
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

  return {
    allWords: allWordsQuery?.data,
    dueWords: dueWordsQuery?.data,
    isLoading:
      allWordsQuery?.isLoading || dueWordsQuery?.isLoading || statsQuery?.isLoading || false,
    isFetching:
      allWordsQuery?.isFetching || dueWordsQuery?.isFetching || statsQuery?.isFetching || false,
    error: allWordsQuery?.error || dueWordsQuery?.error || statsQuery?.error,
  };
}
