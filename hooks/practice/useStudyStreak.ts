import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { gated, studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { StudyStreak } from '@/services/studyStreak';

interface UseStudyStreakResult {
  streak: StudyStreak | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and manage study session streak data
 * Tracks daily study session completion for motivating consistent practice
 *
 * @returns Study streak data, loading state, error state, and refetch function
 *
 * @example
 * const { streak, isLoading } = useStudyStreak();
 * const currentStreak = streak?.currentStreak ?? 0;
 */
export function useStudyStreak(): UseStudyStreakResult {
  const { user } = useAuth();

  const {
    data: streak = null,
    isLoading,
    error,
    refetch,
  } = useQuery(gated(studyStreakQueries.streak, user?.id));

  // The result type promises `() => void`, and every caller uses it that way.
  // TanStack's refetch returns a promise, so hand back a voided wrapper rather
  // than one the contract quietly lies about — memoised, because an unstable
  // identity here would retrigger any effect that depends on it.
  const refetchStreak = useCallback(() => {
    void refetch();
  }, [refetch]);

  return { streak, isLoading, error: error, refetch: refetchStreak };
}
