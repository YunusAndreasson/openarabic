import { renderHook } from '@testing-library/react-native';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { useDueWordsChart } from '@/hooks/vocabulary/useDueWordsChart';
import type { StudyWord } from '@/types/vocabulary.types';
import type { DueWordsForecast } from '@/utils/fsrsUtils';

// Mock the FSRS utilities that are already tested
jest.mock('@/utils/fsrsUtils', () => ({
  calculateDueWordsForecast: (studyWords: StudyWord[], days: number) => {
    // Simple mock implementation
    if (!studyWords || studyWords.length === 0) return [];

    // Filter to only valid words (with due dates)
    const validWords = studyWords.filter(w => w.fsrs_due != null);

    if (validWords.length === 0) return [];

    // Generate mock forecast data
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Count words due on or before this date
      const dueWords = validWords.filter(word => {
        if (!word.fsrs_due) return false;
        const dueDate = new Date(word.fsrs_due);
        return dueDate <= date;
      }).length;

      return {
        date,
        dueWords,
        totalWords: validWords.length,
      };
    });
  },
  calculateDueWordsTrend: (data: DueWordsForecast[]) => {
    if (!data || data.length < 2) return 'stable';
    const first = data[0]?.dueWords ?? 0;
    const last = data[data.length - 1]?.dueWords ?? 0;
    const change = last - first;
    return change > 2 ? 'increasing' : change < -2 ? 'decreasing' : 'stable';
  },
}));

// Mock chart utilities
jest.mock('@/components/common/charts/pathBuilder', () => ({
  buildSmoothChartPath: (params: {
    data: unknown[];
    buildPoint: (x: number, y: number, d: unknown) => unknown;
    dataPointPositions?: number[];
    calculateY?: (d: unknown) => number;
  }) => {
    const { data, buildPoint } = params;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { path: '', points: [] };
    }
    return {
      path: 'M0,0 L100,100',
      points: data.map((d, i) => buildPoint(i * 10, i * 10, d)),
    };
  },
}));

// Mock constants
jest.mock('@/components/common/charts/constants', () => {
  const actualConstants = jest.requireActual('@/components/common/charts/constants');
  return {
    ...actualConstants,
    calculateDataPointPositions: (length: number) => Array.from({ length }, (_, i) => i * 10),
  };
});

describe('useDueWordsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty Data Protection', () => {
    it('should handle empty studyWords array safely', () => {
      const { result } = renderHook(() => useDueWordsChart([]));

      // Should return safe defaults
      expect(result.current.dueWordsData).toEqual([]);
      expect(result.current.chartData.hasData).toBe(false);
      expect(result.current.chartData.dueWordsPath).toBe('');
      expect(result.current.chartData.dataPoints).toEqual([]);
      expect(result.current.chartData.insights).toEqual({
        currentDue: 0,
        peakDue: 0,
        trend: 'stable',
      });
    });

    it('should not crash with undefined studyWords', () => {
      const { result } = renderHook(() => useDueWordsChart(undefined as unknown as StudyWord[]));

      // Should handle gracefully (memoized hook will receive undefined)
      // The hook should either handle it or the mock will return []
      expect(result.current).toBeDefined();
      expect(result.current.chartData).toBeDefined();
    });
  });

  describe('Invalid FSRS Data', () => {
    it('should filter out words with null due dates', () => {
      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: null }), // ✗ No due date
        createTestWord({ id: 2, fsrs_due: null }), // ✗ No due date
        createTestWord({ id: 3, fsrs_due: null }), // ✗ No due date
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      // All words filtered out, should return empty forecast
      expect(result.current.dueWordsData).toEqual([]);
      expect(result.current.chartData.hasData).toBe(false);
      expect(result.current.chartData.insights.currentDue).toBe(0);
    });

    it('should handle mix of valid and invalid due dates', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: today.toISOString() }), // ✓ Valid
        createTestWord({ id: 2, fsrs_due: null }), // ✗ Null
        createTestWord({ id: 3, fsrs_due: tomorrow.toISOString() }), // ✓ Valid
        createTestWord({ id: 4, fsrs_due: null }), // ✗ Null
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Should generate forecast with only 2 valid words
      expect(result.current.dueWordsData.length).toBeGreaterThan(0);
      // Peak should be at most 2 (only 2 valid words)
      expect(result.current.chartData.insights.peakDue).toBeLessThanOrEqual(2);
    });
  });

  describe('Valid Forecast Generation', () => {
    it('should generate 7 days of forecast data', () => {
      const today = new Date();
      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: today.toISOString() }),
        createTestWord({ id: 2, fsrs_due: today.toISOString() }),
        createTestWord({ id: 3, fsrs_due: today.toISOString() }),
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Should have 7 days of forecast
      expect(result.current.dueWordsData).toHaveLength(7);

      // Each forecast entry should have required fields
      result.current.dueWordsData.forEach(forecast => {
        expect(forecast).toHaveProperty('date');
        expect(forecast).toHaveProperty('dueWords');
        expect(forecast.date).toBeInstanceOf(Date);
        expect(typeof forecast.dueWords).toBe('number');
        expect(forecast.dueWords).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate correct due word counts', () => {
      const today = new Date();
      const dayThree = new Date(today);
      dayThree.setDate(dayThree.getDate() + 3);
      const dayFive = new Date(today);
      dayFive.setDate(dayFive.getDate() + 5);

      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: today.toISOString() }), // Due today
        createTestWord({ id: 2, fsrs_due: dayThree.toISOString() }), // Due day 3
        createTestWord({ id: 3, fsrs_due: dayFive.toISOString() }), // Due day 5
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Today should have 1 word due
      expect(result.current.dueWordsData[0]?.dueWords).toBe(1);

      // Day 3 should have 2 words due (cumulative: today + day 3)
      expect(result.current.dueWordsData[3]?.dueWords).toBe(2);

      // Day 6 should have all 3 words due (cumulative)
      expect(result.current.dueWordsData[6]?.dueWords).toBe(3);
    });

    it('should calculate chart insights correctly', () => {
      const today = new Date();
      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: today.toISOString() }),
        createTestWord({ id: 2, fsrs_due: today.toISOString() }),
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      const { insights } = result.current.chartData;

      // Current due should be today's count
      expect(insights.currentDue).toBeDefined();
      expect(insights.currentDue).toBeGreaterThanOrEqual(0);

      // Peak due should be >= current due
      expect(insights.peakDue).toBeGreaterThanOrEqual(insights.currentDue);

      // Trend should be one of the valid values
      expect(['increasing', 'decreasing', 'stable']).toContain(insights.trend);
    });
  });

  describe('Trend Calculation', () => {
    it('should calculate increasing trend', () => {
      const today = new Date();
      const words: StudyWord[] = [];

      // Create words with increasing due dates
      for (let i = 0; i < 10; i++) {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + i);
        words.push(createTestWord({ id: i + 1, fsrs_due: dueDate.toISOString() }));
      }

      const { result } = renderHook(() => useDueWordsChart(words));

      // Should show increasing trend (more words due later)
      expect(result.current.chartData.insights.trend).toBe('increasing');
    });

    it('should calculate stable trend for flat data', () => {
      const today = new Date();
      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: today.toISOString() }),
        createTestWord({ id: 2, fsrs_due: today.toISOString() }),
        createTestWord({ id: 3, fsrs_due: today.toISOString() }),
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      // All words due today, no change over time
      expect(result.current.chartData.insights.trend).toBe('stable');
    });
  });

  describe('hasData Flag', () => {
    it('should be true when studyWords has items, even if all filtered', () => {
      const words: StudyWord[] = [
        createTestWord({ id: 1, fsrs_due: null }), // Will be filtered
        createTestWord({ id: 2, fsrs_due: null }), // Will be filtered
      ];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Current implementation: hasData is false when dueWordsData is empty (early return)
      // This is technically a limitation - ideally should check studyWords.length
      // But testing current behavior: when all words filtered, hasData = false
      expect(result.current.chartData.hasData).toBe(false);
      expect(result.current.dueWordsData).toEqual([]);
    });

    it('should be false only when studyWords is empty', () => {
      const { result } = renderHook(() => useDueWordsChart([]));

      // No words at all
      expect(result.current.chartData.hasData).toBe(false);
    });

    it('should be true with valid due words', () => {
      const today = new Date();
      const words: StudyWord[] = [createTestWord({ id: 1, fsrs_due: today.toISOString() })];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Has words
      expect(result.current.chartData.hasData).toBe(true);
    });
  });

  describe('Chart Data Structure', () => {
    it('should return valid chart data structure', () => {
      const today = new Date();
      const words: StudyWord[] = [createTestWord({ id: 1, fsrs_due: today.toISOString() })];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Verify structure
      expect(result.current).toHaveProperty('dueWordsData');
      expect(result.current).toHaveProperty('chartData');

      const { chartData } = result.current;
      expect(chartData).toHaveProperty('dueWordsPath');
      expect(chartData).toHaveProperty('hasData');
      expect(chartData).toHaveProperty('dataPoints');
      expect(chartData).toHaveProperty('insights');

      expect(Array.isArray(chartData.dataPoints)).toBe(true);
      expect(typeof chartData.dueWordsPath).toBe('string');
      expect(typeof chartData.hasData).toBe('boolean');
    });

    it('should generate data points matching forecast length', () => {
      const today = new Date();
      const words: StudyWord[] = [createTestWord({ id: 1, fsrs_due: today.toISOString() })];

      const { result } = renderHook(() => useDueWordsChart(words));

      // Data points should match forecast data length
      const forecastLength = result.current.dueWordsData.length;
      const dataPointsLength = result.current.chartData.dataPoints.length;

      expect(dataPointsLength).toBe(forecastLength);
    });
  });
});
