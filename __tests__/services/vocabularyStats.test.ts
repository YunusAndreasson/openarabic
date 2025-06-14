import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { vocabularyStatsService } from '../../services/vocabularyStats';
import { handleError } from '../../utils/errorHandling';

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = require('../../services/supabase');

const createBuilder = (response: any, final: 'single' | 'limit' | 'order') => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };

  if (final === 'single') {
    builder.single.mockResolvedValue(response);
  }
  if (final === 'limit') {
    builder.limit.mockResolvedValue(response);
  }
  if (final === 'order') {
    builder.order.mockResolvedValue(response);
  }
  return builder;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('vocabularyStatsService', () => {
  describe('getUserStats', () => {
    it('maps data correctly', async () => {
      const response = {
        data: {
          total_words: 10,
          mastered_words: 5,
          learning_words: 3,
          due_words: 2,
          avg_difficulty: 6,
          avg_stability: 0.8,
        },
        error: null,
      };
      const builder = createBuilder(response, 'single');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getUserStats('u1');

      expect(supabase.from).toHaveBeenCalledWith('user_study_stats');
      expect(builder.select).toHaveBeenCalledWith(
        'total_words, mastered_words, learning_words, due_words, avg_difficulty, avg_stability'
      );
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(result).toEqual({
        totalWords: 10,
        masteredWords: 5,
        learningWords: 3,
        dueWords: 2,
        avgDifficulty: 6,
        avgStability: 0.8,
      });
      expect(handleError).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const err = new Error('fail');
      const response = { data: null, error: err };
      const builder = createBuilder(response, 'single');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getUserStats('u1');

      expect(handleError).toHaveBeenCalledWith(err, { showToast: false });
      expect(result).toBeNull();
    });
  });

  describe('getMasteryProgress', () => {
    it('maps data correctly', async () => {
      const response = {
        data: [
          { date: '2024-01-01', cumulative_words: 2, cumulative_mastered: 1 },
        ],
        error: null,
      };
      const builder = createBuilder(response, 'limit');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getMasteryProgress('u1');

      expect(supabase.from).toHaveBeenCalledWith('daily_mastery_stats');
      expect(builder.limit).toHaveBeenCalledWith(14);
      expect(result).toEqual([
        {
          date: '2024-01-01',
          cumulativeWords: 2,
          cumulativeMastered: 1,
          masteryRate: 50,
        },
      ]);
      expect(handleError).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const err = new Error('oops');
      const response = { data: null, error: err };
      const builder = createBuilder(response, 'limit');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getMasteryProgress('u1');

      expect(handleError).toHaveBeenCalledWith(err, { showToast: false });
      expect(result).toEqual([]);
    });
  });

  describe('getEfficiencyProgress', () => {
    it('maps data correctly', async () => {
      const response = {
        data: [{ date: '2024-01-02', words_reviewed: 5, avg_efficiency: 0.8 }],
        error: null,
      };
      const builder = createBuilder(response, 'limit');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getEfficiencyProgress('u1');

      expect(supabase.from).toHaveBeenCalledWith('daily_efficiency_stats');
      expect(builder.limit).toHaveBeenCalledWith(14);
      expect(result).toEqual([
        {
          date: '2024-01-02',
          wordsReviewed: 5,
          avgEfficiency: 0.8,
        },
      ]);
      expect(handleError).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const err = new Error('err');
      const response = { data: null, error: err };
      const builder = createBuilder(response, 'limit');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getEfficiencyProgress('u1');

      expect(handleError).toHaveBeenCalledWith(err, { showToast: false });
      expect(result).toEqual([]);
    });
  });

  describe('getRetrievabilityForecast', () => {
    it('maps data correctly', async () => {
      const response = {
        data: [
          {
            forecast_date: '2024-05-01',
            word_count: 10,
            avg_retrievability_percent: 80,
            critical_words: 2,
            urgent_words: 1,
          },
        ],
        error: null,
      };
      const builder = createBuilder(response, 'order');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getRetrievabilityForecast('u1');

      expect(supabase.from).toHaveBeenCalledWith('retrievability_forecast');
      expect(builder.order).toHaveBeenCalledWith('forecast_date', { ascending: true });
      expect(result).toEqual([
        {
          forecastDate: '2024-05-01',
          wordCount: 10,
          avgRetrievabilityPercent: 80,
          criticalWords: 2,
          urgentWords: 1,
        },
      ]);
      expect(handleError).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const err = new Error('bad');
      const response = { data: null, error: err };
      const builder = createBuilder(response, 'order');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getRetrievabilityForecast('u1');

      expect(handleError).toHaveBeenCalledWith(err, { showToast: false });
      expect(result).toEqual([]);
    });
  });

  describe('getDifficultyDistribution', () => {
    it('maps data correctly', async () => {
      const response = {
        data: {
          total_words: 20,
          easy_words: 10,
          medium_words: 6,
          hard_words: 4,
          easy_percentage: 50,
          medium_percentage: 30,
          hard_percentage: 20,
        },
        error: null,
      };
      const builder = createBuilder(response, 'single');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getDifficultyDistribution('u1');

      expect(supabase.from).toHaveBeenCalledWith('difficulty_distribution');
      expect(result).toEqual({
        totalWords: 20,
        easyWords: 10,
        mediumWords: 6,
        hardWords: 4,
        easyPercentage: 50,
        mediumPercentage: 30,
        hardPercentage: 20,
      });
      expect(handleError).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const err = new Error('nope');
      const response = { data: null, error: err };
      const builder = createBuilder(response, 'single');
      (supabase.from as jest.Mock).mockReturnValueOnce(builder);

      const result = await vocabularyStatsService.getDifficultyDistribution('u1');

      expect(handleError).toHaveBeenCalledWith(err, { showToast: false });
      expect(result).toBeNull();
    });
  });

  describe('getAllChartData', () => {
    it('aggregates data from all helpers', async () => {
      const userStats = { totalWords: 1, masteredWords: 1, learningWords: 0, dueWords: 0, avgDifficulty: 5, avgStability: 0.5 };
      const mastery = [ { date: 'd', cumulativeWords: 1, cumulativeMastered: 1, masteryRate: 100 } ];
      const efficiency = [ { date: 'd', wordsReviewed: 1, avgEfficiency: 0.9 } ];
      const retrieve = [ { forecastDate: 'd', wordCount: 1, avgRetrievabilityPercent: 90, criticalWords: 0, urgentWords: 0 } ];
      const difficulty = { totalWords: 1, easyWords: 1, mediumWords: 0, hardWords: 0, easyPercentage: 100, mediumPercentage: 0, hardPercentage: 0 };

      jest.spyOn(vocabularyStatsService, 'getUserStats').mockResolvedValueOnce(userStats);
      jest.spyOn(vocabularyStatsService, 'getMasteryProgress').mockResolvedValueOnce(mastery);
      jest.spyOn(vocabularyStatsService, 'getEfficiencyProgress').mockResolvedValueOnce(efficiency);
      jest.spyOn(vocabularyStatsService, 'getRetrievabilityForecast').mockResolvedValueOnce(retrieve);
      jest.spyOn(vocabularyStatsService, 'getDifficultyDistribution').mockResolvedValueOnce(difficulty);

      const result = await vocabularyStatsService.getAllChartData('u1');

      expect(vocabularyStatsService.getUserStats).toHaveBeenCalledWith('u1');
      expect(vocabularyStatsService.getMasteryProgress).toHaveBeenCalledWith('u1');
      expect(vocabularyStatsService.getEfficiencyProgress).toHaveBeenCalledWith('u1');
      expect(vocabularyStatsService.getRetrievabilityForecast).toHaveBeenCalledWith('u1');
      expect(vocabularyStatsService.getDifficultyDistribution).toHaveBeenCalledWith('u1');

      expect(result).toEqual({
        userStats,
        masteryProgress: mastery,
        efficiencyProgress: efficiency,
        retrievabilityForecast: retrieve,
        difficultyDistribution: difficulty,
      });
    });
  });
});

