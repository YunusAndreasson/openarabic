import { supabase } from './supabase';

export interface VocabularyStatsFromDB {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  dueWords: number;
  avgDifficulty: number;
  avgStability: number;
}

export interface MasteryProgressData {
  date: string;
  cumulativeWords: number;
  cumulativeMastered: number;
  masteryRate: number;
}

export interface EfficiencyProgressData {
  date: string;
  wordsReviewed: number;
  avgEfficiency: number;
}

export interface RetrievabilityData {
  forecastDate: string;
  wordCount: number;
  avgRetrievabilityPercent: number;
  criticalWords: number;
  urgentWords: number;
}

export interface DifficultyStats {
  totalWords: number;
  easyWords: number;
  mediumWords: number;
  hardWords: number;
  easyPercentage: number;
  mediumPercentage: number;
  hardPercentage: number;
}

export const vocabularyStatsService = {
  /**
   * Get user's vocabulary statistics using the optimized database view
   */
  async getUserStats(userId: string): Promise<VocabularyStatsFromDB | null> {
    try {
      const { data, error } = await supabase
        .from('user_study_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user stats:', error);
        return null;
      }

      return {
        totalWords: data.total_words || 0,
        masteredWords: data.mastered_words || 0,
        learningWords: data.learning_words || 0,
        dueWords: data.due_words || 0,
        avgDifficulty: data.avg_difficulty || 6.5,
        avgStability: data.avg_stability || 0,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  },

  /**
   * Get mastery progression data for charts using the optimized database view
   */
  async getMasteryProgress(userId: string, days = 14): Promise<MasteryProgressData[]> {
    try {
      const { data, error } = await supabase
        .from('daily_mastery_stats')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(days);

      if (error) {
        console.error('Error fetching mastery progress:', error);
        return [];
      }

      return data.map(row => ({
        date: row.date || '',
        cumulativeWords: Number(row.cumulative_words) || 0,
        cumulativeMastered: Number(row.cumulative_mastered) || 0,
        masteryRate:
          Number(row.cumulative_words) > 0
            ? (Number(row.cumulative_mastered) / Number(row.cumulative_words)) * 100
            : 0,
      }));
    } catch (error) {
      console.error('Error fetching mastery progress:', error);
      return [];
    }
  },

  /**
   * Get efficiency progression data for charts using the optimized database view
   */
  async getEfficiencyProgress(userId: string, days = 14): Promise<EfficiencyProgressData[]> {
    try {
      const { data, error } = await supabase
        .from('daily_efficiency_stats')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(days);

      if (error) {
        console.error('Error fetching efficiency progress:', error);
        return [];
      }

      return data.map(row => ({
        date: row.date || '',
        wordsReviewed: row.words_reviewed || 0,
        avgEfficiency: row.avg_efficiency || 0,
      }));
    } catch (error) {
      console.error('Error fetching efficiency progress:', error);
      return [];
    }
  },

  /**
   * Get retrievability forecast data using the optimized database view
   */
  async getRetrievabilityForecast(userId: string): Promise<RetrievabilityData[]> {
    try {
      const { data, error } = await supabase
        .from('retrievability_forecast')
        .select('*')
        .eq('user_id', userId)
        .order('forecast_date', { ascending: true });

      if (error) {
        console.error('Error fetching retrievability forecast:', error);
        return [];
      }

      return data.map(row => ({
        forecastDate: row.forecast_date || '',
        wordCount: row.word_count || 0,
        avgRetrievabilityPercent: row.avg_retrievability_percent || 0,
        criticalWords: row.critical_words || 0,
        urgentWords: row.urgent_words || 0,
      }));
    } catch (error) {
      console.error('Error fetching retrievability forecast:', error);
      return [];
    }
  },

  /**
   * Get difficulty distribution using the optimized database view
   */
  async getDifficultyDistribution(userId: string): Promise<DifficultyStats | null> {
    try {
      const { data, error } = await supabase
        .from('difficulty_distribution')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching difficulty distribution:', error);
        return null;
      }

      return {
        totalWords: data.total_words || 0,
        easyWords: data.easy_words || 0,
        mediumWords: data.medium_words || 0,
        hardWords: data.hard_words || 0,
        easyPercentage: data.easy_percentage || 0,
        mediumPercentage: data.medium_percentage || 0,
        hardPercentage: data.hard_percentage || 0,
      };
    } catch (error) {
      console.error('Error fetching difficulty distribution:', error);
      return null;
    }
  },

  /**
   * Get all chart data in a single optimized call
   */
  async getAllChartData(userId: string): Promise<{
    userStats: VocabularyStatsFromDB | null;
    masteryProgress: MasteryProgressData[];
    efficiencyProgress: EfficiencyProgressData[];
    retrievabilityForecast: RetrievabilityData[];
    difficultyDistribution: DifficultyStats | null;
  }> {
    try {
      // Execute all queries in parallel for maximum performance
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
    } catch (error) {
      console.error('Error fetching all chart data:', error);
      return {
        userStats: null,
        masteryProgress: [],
        efficiencyProgress: [],
        retrievabilityForecast: [],
        difficultyDistribution: null,
      };
    }
  },
};
