import { useQuery } from '@tanstack/react-query';

import { vocabularyStatsService } from '@/services/vocabularyStats';
import type {
  VocabularyStatsFromDB,
  MasteryProgressData,
  EfficiencyProgressData,
  RetrievabilityData,
  DifficultyStats,
} from '@/services/vocabularyStats';

interface UseVocabularyChartDataResult {
  // User stats
  userStats: VocabularyStatsFromDB | null;
  isLoadingUserStats: boolean;

  // Chart data
  masteryProgress: MasteryProgressData[];
  efficiencyProgress: EfficiencyProgressData[];
  retrievabilityForecast: RetrievabilityData[];
  difficultyDistribution: DifficultyStats | null;

  // Loading states
  isLoadingChartData: boolean;
  isLoadingAny: boolean;

  // Error handling
  error: Error | null;
}

/**
 * Hook to fetch optimized vocabulary chart data using database views
 * This replaces heavy client-side calculations with efficient database queries
 */
export function useVocabularyChartData(userId: string | undefined): UseVocabularyChartDataResult {
  // Fetch user stats separately for immediate display
  const {
    data: userStats = null,
    isLoading: isLoadingUserStats,
    error: userStatsError,
  } = useQuery({
    queryKey: ['vocabulary-stats', 'user', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(null);
      return vocabularyStatsService.getUserStats(userId);
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute - stats change frequently
    gcTime: 300000, // 5 minutes
    retry: 2,
  });

  // Fetch all chart data in parallel for optimal performance
  const {
    data: chartData,
    isLoading: isLoadingChartData,
    error: chartDataError,
  } = useQuery({
    queryKey: ['vocabulary-stats', 'charts', userId],
    queryFn: () => {
      if (!userId)
        return Promise.resolve({
          userStats: null,
          masteryProgress: [],
          efficiencyProgress: [],
          retrievabilityForecast: [],
          difficultyDistribution: null,
        });
      return vocabularyStatsService.getAllChartData(userId);
    },
    enabled: !!userId,
    staleTime: 180000, // 3 minutes - chart data changes less frequently
    gcTime: 600000, // 10 minutes
    retry: 2,
  });

  return {
    // User stats (immediate)
    userStats: userStats || chartData?.userStats || null,
    isLoadingUserStats,

    // Chart data
    masteryProgress: chartData?.masteryProgress || [],
    efficiencyProgress: chartData?.efficiencyProgress || [],
    retrievabilityForecast: chartData?.retrievabilityForecast || [],
    difficultyDistribution: chartData?.difficultyDistribution || null,

    // Loading states
    isLoadingChartData,
    isLoadingAny: isLoadingUserStats || isLoadingChartData,

    // Error handling
    error: userStatsError || chartDataError || null,
  };
}
