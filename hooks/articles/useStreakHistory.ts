import { useQuery } from '@tanstack/react-query';

import { readingProgressQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { ReadingStreakService, type StreakHistoryData } from '@/services/studyStreak';

interface UseStreakHistoryOptions {
  days?: number;
  enabled?: boolean;
}

interface UseStreakHistoryResult {
  streakHistory: StreakHistoryData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  // TanStack Query refetch function with proper types
  refetch: () => Promise<unknown>;
}

export function useStreakHistory(options: UseStreakHistoryOptions = {}): UseStreakHistoryResult {
  const { days = 30, enabled = true } = options;
  const { user } = useAuth();

  const {
    data: streakHistory,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: user?.id
      ? readingProgressQueries.keys.streakHistory(user.id, days)
      : ['streak-history', 'none'],
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return ReadingStreakService.getStreakHistory(user.id, days);
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    streakHistory,
    isLoading,
    isError,
    error: error,
    refetch,
  };
}
