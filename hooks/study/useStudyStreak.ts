import { useQuery } from '@tanstack/react-query';

import { studyStreakQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { studySessionStreakService, type StudyStreak } from '@/services/studyStreak';
import { handleError } from '@/utils/errorHandling';

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
  } = useQuery({
    queryKey: user?.id ? studyStreakQueries.keys.streak(user.id) : ['study-streak', 'none'],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        return await studySessionStreakService.getStudySessionStreak(user.id);
      } catch (error) {
        handleError(error as Error, { showToast: false });
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds (fresher than reading streak)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { streak, isLoading, error: error as Error | null, refetch };
}
