import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database.types';
import { executeQuery } from '@/utils/supabaseHelpers';

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
        toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
        analyticsEventName: 'User_Stats_Load_Error',
        analyticsProperties: { userId },
        showToast: false, // Silent for stats
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

  async getMasteryProgress(_userId: string) {
    const data = await executeQuery(
      () => supabase.from('daily_mastery_stats').select('*').limit(14),
      {
        toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
        analyticsEventName: 'Mastery_Progress_Load_Error',
        showToast: false,
      },
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

  async getEfficiencyProgress(_userId: string) {
    const data = await executeQuery(
      () => supabase.from('daily_efficiency_stats').select('*').limit(14),
      {
        toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
        analyticsEventName: 'Efficiency_Progress_Load_Error',
        showToast: false,
      },
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

  async getRetrievabilityForecast(_userId: string) {
    const data = await executeQuery(
      () =>
        supabase
          .from('retrievability_forecast')
          .select('*')
          .order('forecast_date', { ascending: true }),
      {
        toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
        analyticsEventName: 'Retrievability_Forecast_Load_Error',
        showToast: false,
      },
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

  async getDifficultyDistribution(_userId: string) {
    const data = await executeQuery(
      () => supabase.from('difficulty_distribution').select('*').single(),
      {
        toastMessage: STRINGS.UNABLE_TO_LOAD_CHART_DATA,
        analyticsEventName: 'Difficulty_Distribution_Load_Error',
        showToast: false,
      },
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
      this.getMasteryProgress(userId),
      this.getEfficiencyProgress(userId),
      this.getRetrievabilityForecast(userId),
      this.getDifficultyDistribution(userId),
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

export type VocabularyStatsService = typeof vocabularyStatsService;
