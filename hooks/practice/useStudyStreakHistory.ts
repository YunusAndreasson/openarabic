import { skipToken, useQuery } from '@tanstack/react-query';

import { studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { StreakHistoryData } from '@/services/studyStreak';

interface UseStudyStreakHistoryResult {
  streakHistory: StreakHistoryData | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch complete study session streak history with visualization data
 * Used by the study-streak route screen to display 40-day chart and metrics
 *
 * @returns Streak history with daily activity, streak periods, and metrics
 *
 * @example
 * const { streakHistory, isLoading } = useStudyStreakHistory();
 * if (streakHistory) {
 *   <StreakChart dailyActivity={streakHistory.dailyActivity} />
 * }
 */
export function useStudyStreakHistory(): UseStudyStreakHistoryResult {
  const { user } = useAuth();

  const historyConfig = studyStreakQueries.history(user?.id ?? '', 40);
  const {
    data: streakHistory = null,
    isLoading,
    isError,
  } = useQuery({
    ...historyConfig,
    queryFn: user?.id ? historyConfig.queryFn : skipToken,
  });

  return { streakHistory, isLoading, isError };
}
