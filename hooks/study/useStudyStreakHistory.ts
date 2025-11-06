import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/auth/useAuth';
import { studySessionStreakService, type StreakHistoryData } from '@/services/studyStreak';
import { handleError } from '@/utils/errorHandling';

interface UseStudyStreakHistoryResult {
  streakHistory: StreakHistoryData | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch complete study session streak history with visualization data
 * Used by StudyStreakBottomSheet to display 40-day chart and metrics
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

  const {
    data: streakHistory = null,
    isLoading,
    isError,
  } = useQuery({
    queryKey: user?.id ? ['study-streak-history', user.id] : ['study-streak-history', 'none'],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        return await studySessionStreakService.getStudySessionHistory(user.id, 40);
      } catch (error) {
        handleError(error as Error, {
          showToast: false,
          analyticsEventName: 'Study_Streak_History_Load_Error',
        });
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes (stable historical data)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { streakHistory, isLoading, isError };
}
