import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  userStats: createServiceErrorConfig('user_stats', 'load', {
    toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
    showToast: false,
  }),
  masteryProgress: createServiceErrorConfig('mastery_progress', 'load', {
    toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
    showToast: false,
  }),
  efficiencyProgress: createServiceErrorConfig('efficiency_progress', 'load', {
    toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
    showToast: false,
  }),
  retrievabilityForecast: createServiceErrorConfig('retrievability_forecast', 'load', {
    toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
    showToast: false,
  }),
  difficultyDistribution: createServiceErrorConfig('difficulty_distribution', 'load', {
    toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
    showToast: false,
  }),
};

export const vocabularyStatsService = {
  async getUserStats(userId: string) {
    const data = await executeQuery(
      () =>
        supabase
          .from('user_study_stats')
          .select(
            'total_words, mastered_words, learning_words, due_words, avg_difficulty, avg_stability',
          )
          .eq('user_id', userId)
          .single(),
      {
        ...errorConfig.userStats,
        analyticsProperties: { userId },
      },
    );

    if (!data) return null;

    const typedData = data as Tables<'user_study_stats'>;
    return {
      totalWords: typedData.total_words,
      masteredWords: typedData.mastered_words,
      learningWords: typedData.learning_words,
      dueWords: typedData.due_words,
      avgDifficulty: typedData.avg_difficulty,
      avgStability: typedData.avg_stability,
    };
  },

  async getMasteryProgress() {
    const data = await executeQuery(
      () => supabase.from('daily_mastery_stats').select('*').limit(14),
      errorConfig.masteryProgress,
    );

    // Note: daily_mastery_stats view may have additional fields not in type definition
    type MasteryStatsRow = Tables<'daily_mastery_stats'> & {
      cumulative_words?: number;
      cumulative_mastered?: number;
    };

    return (
      data?.map((d: MasteryStatsRow) => ({
        date: d.date as string,
        cumulativeWords: Number(d.cumulative_words ?? 0),
        cumulativeMastered: Number(d.cumulative_mastered ?? 0),
        masteryRate: Math.round(
          (Number(d.cumulative_mastered ?? 0) / Math.max(1, Number(d.cumulative_words ?? 0))) * 100,
        ),
      })) ?? []
    );
  },

  async getEfficiencyProgress() {
    const data = await executeQuery(
      () => supabase.from('daily_efficiency_stats').select('*').limit(14),
      errorConfig.efficiencyProgress,
    );

    // Note: daily_efficiency_stats view may have additional fields not in type definition
    type EfficiencyStatsRow = Tables<'daily_efficiency_stats'> & {
      avg_efficiency?: number;
    };

    return (
      data?.map((d: EfficiencyStatsRow) => ({
        date: d.date as string,
        wordsReviewed: Number(d.words_reviewed ?? 0),
        avgEfficiency: Number(d.avg_efficiency ?? 0),
      })) ?? []
    );
  },

  async getRetrievabilityForecast() {
    const data = await executeQuery(
      () =>
        supabase
          .from('retrievability_forecast')
          .select('*')
          .order('forecast_date', { ascending: true }),
      errorConfig.retrievabilityForecast,
    );

    return (
      data?.map(d => ({
        forecastDate: d.forecast_date as string,
        wordCount: Number(d.word_count ?? 0),
        avgRetrievabilityPercent: Number(d.avg_retrievability_percent ?? 0),
        criticalWords: Number(d.critical_words ?? 0),
        urgentWords: Number(d.urgent_words ?? 0),
      })) ?? []
    );
  },

  async getDifficultyDistribution() {
    const data = await executeQuery(
      () => supabase.from('difficulty_distribution').select('*').single(),
      errorConfig.difficultyDistribution,
    );

    if (!data) return null;

    const typedData = data as Tables<'difficulty_distribution'>;
    return {
      totalWords: Number(typedData.total_words ?? 0),
      easyWords: Number(typedData.easy_words ?? 0),
      mediumWords: Number(typedData.medium_words ?? 0),
      hardWords: Number(typedData.hard_words ?? 0),
      easyPercentage: Number(typedData.easy_percentage ?? 0),
      mediumPercentage: Number(typedData.medium_percentage ?? 0),
      hardPercentage: Number(typedData.hard_percentage ?? 0),
    };
  },

  async getAllChartData(userId: string) {
    const [
      userStats,
      masteryProgress,
      efficiencyProgress,
      retrievabilityForecast,
      difficultyDistribution,
    ] = await Promise.all([
      this.getUserStats(userId),
      this.getMasteryProgress(),
      this.getEfficiencyProgress(),
      this.getRetrievabilityForecast(),
      this.getDifficultyDistribution(),
    ]);

    return {
      userStats,
      masteryProgress,
      efficiencyProgress,
      retrievabilityForecast,
      difficultyDistribution,
    };
  },
};
