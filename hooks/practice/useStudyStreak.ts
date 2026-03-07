import { skipToken, useQuery } from '@tanstack/react-query';

import { studyStreakQueries } from '@/constants/queries';
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

  const streakConfig = studyStreakQueries.streak(user?.id ?? '');
  const {
    data: streak = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...streakConfig,
    queryFn: user?.id ? streakConfig.queryFn : skipToken,
  });

  return { streak, isLoading, error: error as Error | null, refetch };
}
