import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

export const vocabularyStatsService = {
  async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_study_stats')
        .select(
          'total_words, mastered_words, learning_words, due_words, avg_difficulty, avg_stability'
        )
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      if (!data) return null;
      return {
        totalWords: data.total_words,
        masteredWords: data.mastered_words,
        learningWords: data.learning_words,
        dueWords: data.due_words,
        avgDifficulty: data.avg_difficulty,
        avgStability: data.avg_stability,
      };
    } catch (err) {
      handleError(err as Error, { showToast: false });
      return null;
    }
  },

  async getMasteryProgress(_userId: string) {
    try {
      const { data, error } = await supabase.from('daily_mastery_stats').select('*').limit(14);
      if (error) throw error;
      return (
        data?.map(d => ({
          date: d.date as string,
          cumulativeWords: Number((d as any).cumulative_words ?? 0),
          cumulativeMastered: Number((d as any).cumulative_mastered ?? 0),
          masteryRate: Math.round(
            (Number((d as any).cumulative_mastered ?? 0) /
              Math.max(1, Number((d as any).cumulative_words ?? 0))) *
              100
          ),
        })) ?? []
      );
    } catch (err) {
      handleError(err as Error, { showToast: false });
      return [];
    }
  },

  async getEfficiencyProgress(_userId: string) {
    try {
      const { data, error } = await supabase.from('daily_efficiency_stats').select('*').limit(14);
      if (error) throw error;
      return (
        data?.map(d => ({
          date: d.date as string,
          wordsReviewed: Number(d.words_reviewed ?? 0),
          avgEfficiency: Number((d as any).avg_efficiency ?? 0),
        })) ?? []
      );
    } catch (err) {
      handleError(err as Error, { showToast: false });
      return [];
    }
  },

  async getRetrievabilityForecast(_userId: string) {
    try {
      const { data, error } = await supabase
        .from('retrievability_forecast')
        .select('*')
        .order('forecast_date', { ascending: true });
      if (error) throw error;
      return (
        data?.map(d => ({
          forecastDate: d.forecast_date as string,
          wordCount: Number(d.word_count ?? 0),
          avgRetrievabilityPercent: Number(d.avg_retrievability_percent ?? 0),
          criticalWords: Number(d.critical_words ?? 0),
          urgentWords: Number(d.urgent_words ?? 0),
        })) ?? []
      );
    } catch (err) {
      handleError(err as Error, { showToast: false });
      return [];
    }
  },

  async getDifficultyDistribution(_userId: string) {
    try {
      const { data, error } = await supabase.from('difficulty_distribution').select('*').single();
      if (error) throw error;
      if (!data) return null;
      return {
        totalWords: Number(data.total_words ?? 0),
        easyWords: Number(data.easy_words ?? 0),
        mediumWords: Number(data.medium_words ?? 0),
        hardWords: Number(data.hard_words ?? 0),
        easyPercentage: Number(data.easy_percentage ?? 0),
        mediumPercentage: Number(data.medium_percentage ?? 0),
        hardPercentage: Number(data.hard_percentage ?? 0),
      };
    } catch (err) {
      handleError(err as Error, { showToast: false });
      return null;
    }
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
