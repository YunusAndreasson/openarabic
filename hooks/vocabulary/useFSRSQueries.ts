import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries, gated } from '@/constants/queries';
import type { StudyWord } from '@/types/vocabulary.types';
import { filterDueWords } from '@/utils/newWordPacing';

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

  // allWordsQuery: no initialData needed — useQuery automatically reads its own cache
  const allWordsQuery = useQuery(gated(fsrsQueries.all, userId));

  // Query for due words - uses shorter stale time since it's more time-sensitive.
  // The factory owns the queryFn (conditional session cooldown included) and
  // encodes cooldown + limit in the key, so callers with different limits get
  // distinct cache entries instead of racing over one.
  const dueWordsQuery = useQuery({
    ...gated(id => fsrsQueries.due(id, DEFAULT_SESSION_COOLDOWN_HOURS, limit), userId),
    // Use allWords as placeholder while due words fetch — shows filtered data immediately
    // placeholderData (not initialData) so it doesn't create a stale cache entry
    placeholderData: () => {
      if (!userId) return undefined;
      const allWords = queryClient.getQueryData<StudyWord[]>(fsrsQueries.all(userId).queryKey);
      if (!allWords) return undefined;

      const lastCompletedAt = queryClient.getQueryData<number>(
        fsrsQueries.lastCompletedAtKey(userId),
      );
      const filtered = filterDueWords(allWords, {
        lastCompletedAt,
        cooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
        nowMs: Date.now(),
      });

      return filtered.slice(0, limit);
    },
  });

  return {
    allWords: allWordsQuery?.data,
    dueWords: dueWordsQuery?.data,
    isLoading: allWordsQuery?.isLoading || dueWordsQuery?.isLoading || false,
    isFetching: allWordsQuery?.isFetching || dueWordsQuery?.isFetching || false,
    error: allWordsQuery?.error || dueWordsQuery?.error || null,
  };
}
