import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { estimateDueWordsFromCache, fsrsQueries, gated } from '@/constants/queries';
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

function getDueWordsPlaceholder(
  queryClient: QueryClient,
  userId: string | undefined,
  limit: number | undefined,
): StudyWord[] | undefined {
  if (!userId) return undefined;
  return estimateDueWordsFromCache(queryClient, userId, Date.now())?.slice(0, limit);
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
    placeholderData: () => getDueWordsPlaceholder(queryClient, userId, limit),
  });

  return {
    allWords: allWordsQuery.data,
    dueWords: dueWordsQuery.data,
    isLoading: allWordsQuery.isLoading || dueWordsQuery.isLoading,
    isFetching: allWordsQuery.isFetching || dueWordsQuery.isFetching,
    error: allWordsQuery.error || dueWordsQuery.error || null,
  };
}

/** Subscribe only to the due-word count needed by navigation chrome. */
export function useDueWordsCount({ userId, limit }: UseFSRSQueriesOptions): number {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...gated(id => fsrsQueries.due(id, DEFAULT_SESSION_COOLDOWN_HOURS, limit), userId),
    placeholderData: () => getDueWordsPlaceholder(queryClient, userId, limit),
    select: words => words.length,
  });

  return query.data ?? 0;
}

/** Subscribe only to whether a user has any saved study words. */
export function useHasStudyWords(userId: string | undefined): boolean {
  const query = useQuery({
    ...gated(fsrsQueries.all, userId),
    select: words => words.length > 0,
  });

  return query.data ?? false;
}
