import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/auth/useAuth';
import { readingStreakService, type ReadingStreak } from '@/services/readingStreak';
import { handleError } from '@/utils/errorHandling';

interface UseReadingStreakResult {
  streak: ReadingStreak | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to get and manage user's reading streak data
 */
export function useReadingStreak(): UseReadingStreakResult {
  const { user } = useAuth();

  const {
    data: streak = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reading-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        return await readingStreakService.getReadingStreak(user.id);
      } catch (error) {
        handleError(error as Error, { showToast: false });
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - streaks don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false, // Mobile-only: no window focus concept
  });

  return {
    streak,
    isLoading,
    error: error,
    refetch,
  };
}
