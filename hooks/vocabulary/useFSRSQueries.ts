import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_BASE_KEY, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { CACHE_TIMES } from '@/constants/queryKeys';
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

  const allWordsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.all(userId) : ['no-user'],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return studyWordsFSRSService.getFSRSWords(userId, { forStats: false });
    },
    enabled: !!userId, // Only enable when we have userId
    ...CACHE_TIMES.MEDIUM,
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData(FSRS_QUERY_KEYS.all(userId));
    },
  });

  // Query for due words - uses shorter stale time since it's more time-sensitive
  const dueWordsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.due(userId) : ['no-user', 'due'],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      // Apply cooldown only if the last session was just completed
      const lastCompletedAt = queryClient.getQueryData<number>([
        FSRS_BASE_KEY,
        userId,
        'lastCompletedAt',
      ]);
      const recentlyCompleted =
        typeof lastCompletedAt === 'number' &&
        Date.now() - lastCompletedAt < DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;

      return studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        limit,
        ...(recentlyCompleted ? { sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS } : {}),
      });
    },
    enabled: !!userId, // Only enable when we have userId
    ...CACHE_TIMES.SHORT, // 1 minute - due words change frequently
    // Use data from allWordsQuery if available and filter client-side
    initialData: () => {
      if (!userId) return undefined;
      const allWords = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(userId));
      if (allWords) {
        const nowMs = Date.now();
        // Apply cooldown only if session was recently completed
        const lastCompletedAt = queryClient.getQueryData<number>([
          FSRS_BASE_KEY,
          userId,
          'lastCompletedAt',
        ]);
        const applyCooldown =
          typeof lastCompletedAt === 'number' &&
          Date.now() - lastCompletedAt < DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;
        const cutoffMs = applyCooldown
          ? nowMs - DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000
          : -Infinity;

        const normalizeTs = (ts: string | null | undefined) =>
          ts ? ts.replace(' ', 'T') : undefined;

        const filtered = allWords.filter(word => {
          // New words (state 0) are always due for their first review
          if (word.fsrs_state === 0) {
            return true;
          }

          const dueStr = normalizeTs(word.fsrs_due);
          const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;
          const isDue = Number.isFinite(dueMs) && dueMs <= nowMs;

          const lastStr = normalizeTs(word.fsrs_last_review);
          const lastMs = lastStr ? Date.parse(lastStr) : 0;
          const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
          return isDue && !isRecentlyReviewed;
        });

        return filtered.slice(0, limit);
      }
      return undefined;
    },
  });

  // Query for stats - can use longer cache times since stats update less frequently
  const statsQuery = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.stats(userId) : ['no-user', 'stats'],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return studyWordsFSRSService.getFSRSWords(userId, { forStats: true });
    },
    enabled: !!userId, // Only enable when we have userId
    staleTime: 600000, // 10 minutes - stats update less frequently
    gcTime: 1800000, // 30 minutes
    retry: (failureCount, _error) => {
      return failureCount < 3; // Retry up to 3 times
    },
  });

  return {
    allWords: allWordsQuery?.data,
    dueWords: dueWordsQuery?.data,
    isLoading:
      allWordsQuery?.isLoading || dueWordsQuery?.isLoading || statsQuery?.isLoading || false,
    isFetching:
      allWordsQuery?.isFetching || dueWordsQuery?.isFetching || statsQuery?.isFetching || false,
    // Fix: Clear empty error objects that React Query sometimes leaves behind
    error: (() => {
      const allWordsError = allWordsQuery?.error;
      const dueWordsError = dueWordsQuery?.error;
      const statsError = statsQuery?.error;

      // If any query has a real error, return it
      if (allWordsError && Object.keys(allWordsError).length > 0) return allWordsError;
      if (dueWordsError && Object.keys(dueWordsError).length > 0) return dueWordsError;
      if (statsError && Object.keys(statsError).length > 0) return statsError;

      // If all queries succeeded (no real errors), return null
      return null;
    })(),
  };
}
