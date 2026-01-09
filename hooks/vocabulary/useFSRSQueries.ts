import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_BASE_KEY } from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';
import { normalizeTimestamp } from '@/utils/dateTimeUtils';

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
    ...fsrsQueries.all(userId || ''),
    enabled: !!userId,
    initialData: () => {
      if (!userId) return undefined;
      return queryClient.getQueryData(fsrsQueries.all(userId).queryKey);
    },
  });

  // Query for due words - uses shorter stale time since it's more time-sensitive
  const dueWordsQuery = useQuery({
    ...fsrsQueries.due(userId || '', DEFAULT_SESSION_COOLDOWN_HOURS),
    enabled: !!userId,
    // Override queryFn to check for recent session completion
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
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
    // Use data from allWordsQuery if available and filter client-side
    initialData: () => {
      if (!userId) return undefined;
      const allWords = queryClient.getQueryData<StudyWord[]>(fsrsQueries.all(userId).queryKey);
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

        const filtered = allWords.filter(word => {
          // New words (state 0) are always due for their first review
          if (word.fsrs_state === 0) {
            return true;
          }

          const dueStr = normalizeTimestamp(word.fsrs_due);
          const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;
          const isDue = Number.isFinite(dueMs) && dueMs <= nowMs;

          const lastStr = normalizeTimestamp(word.fsrs_last_review);
          const lastMs = lastStr ? Date.parse(lastStr) : 0;
          const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cutoffMs;
          return isDue && !isRecentlyReviewed;
        });

        return filtered.slice(0, limit);
      }
      return undefined;
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
