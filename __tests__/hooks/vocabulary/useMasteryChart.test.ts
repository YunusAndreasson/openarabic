/**
 * useMasteryChart Hook Tests
 *
 * Tests mastery chart data generation for vocabulary visualization.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { renderHook } from '@testing-library/react-native';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { useMasteryChart } from '@/hooks/vocabulary/useMasteryChart';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock the useCountBasedChart hook
const mockUseCountBasedChart = jest.fn();
jest.mock('@/hooks/vocabulary/useCountBasedChart', () => ({
  useCountBasedChart: (...args: unknown[]) => mockUseCountBasedChart(...args),
  parseWordWithStability: jest.fn((word: StudyWord) => ({
    createdAt: new Date(word.created_at),
    lastReview: word.fsrs_last_review ? new Date(word.fsrs_last_review) : null,
    state: word.fsrs_state,
    stability: word.fsrs_stability,
  })),
}));

describe('useMasteryChart', () => {
  const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
    ({
      id: 1,
      user_id: 'user-123',
      root_id: 42,
      fsrs_state: 2, // Review state
      fsrs_stability: 10,
      fsrs_difficulty: 0.3,
      fsrs_due: new Date(Date.now() + 86400000).toISOString(),
      fsrs_last_review: new Date().toISOString(),
      fsrs_reps: 5,
      fsrs_lapses: 0,
      fsrs_elapsed_days: 1,
      fsrs_scheduled_days: 3,
      created_at: new Date().toISOString(),
      root: {
        id: 42,
        letters: 'كتب',
        meaning: 'to write',
        audio_url: null,
        audio_url_en: null,
      },
      ...overrides,
    }) as StudyWord;

  const mockChartResult = {
    path: 'M0,100 L50,80 L100,60',
    hasData: true,
    milestones: [{ x: 50, y: 80, count: 10, achieved: true, date: new Date() }],
    points: [
      { x: 0, y: 100, count: 0, date: new Date() },
      { x: 50, y: 80, count: 5, date: new Date() },
      { x: 100, y: 60, count: 10, date: new Date() },
    ],
    tooltipPoints: [],
    subtitle: '10 words mastered',
    xLabels: ['Mon', 'Wed', 'Fri'],
    xLabelPositions: [0, 50, 100],
    insights: {
      currentCount: 10,
      trend: 'improving' as const,
      totalCount: 10,
      weeklyChange: 5,
    },
    maxCount: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCountBasedChart.mockReturnValue(mockChartResult);
  });

  describe('Hook Interface', () => {
    test('returns expected chart data structure', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(result.current).toHaveProperty('masteryPath');
      expect(result.current).toHaveProperty('hasData');
      expect(result.current).toHaveProperty('milestones');
      expect(result.current).toHaveProperty('points');
      expect(result.current).toHaveProperty('tooltipPoints');
      expect(result.current).toHaveProperty('subtitle');
      expect(result.current).toHaveProperty('xLabels');
      expect(result.current).toHaveProperty('xLabelPositions');
      expect(result.current).toHaveProperty('insights');
      expect(result.current).toHaveProperty('maxCount');
    });

    test('maps path to masteryPath', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(result.current.masteryPath).toBe(mockChartResult.path);
    });

    test('maps totalCount to totalMastered in insights', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(result.current.insights.totalMastered).toBe(mockChartResult.insights.totalCount);
    });
  });

  describe('Data Processing', () => {
    test('passes study words to useCountBasedChart', () => {
      const words = [createMockWord(), createMockWord({ id: 2 })];
      renderHook(() => useMasteryChart(words));

      expect(mockUseCountBasedChart).toHaveBeenCalledWith(words, expect.any(Object));
    });

    test('handles empty study words array', () => {
      mockUseCountBasedChart.mockReturnValue({
        ...mockChartResult,
        hasData: false,
        path: '',
        insights: { currentCount: 0, trend: 'stable', totalCount: 0 },
      });

      const { result } = renderHook(() => useMasteryChart([]));

      expect(result.current.hasData).toBeFalsy();
    });

    test('handles undefined study words', () => {
      const { result } = renderHook(() => useMasteryChart(undefined as unknown as StudyWord[]));

      // Should handle gracefully
      expect(mockUseCountBasedChart).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    test('provides config for mastered word counting', () => {
      renderHook(() => useMasteryChart([]));

      const config = mockUseCountBasedChart.mock.calls[0][1];
      expect(config).toHaveProperty('parseWord');
      expect(config).toHaveProperty('shouldCountWord');
      expect(config).toHaveProperty('buildDailyData');
      expect(config).toHaveProperty('getCount');
      expect(config).toHaveProperty('zeroStateMessage');
    });

    test('zeroStateMessage mentions memory strength', () => {
      renderHook(() => useMasteryChart([]));

      const config = mockUseCountBasedChart.mock.calls[0][1];
      expect(config.zeroStateMessage).toContain('memory strength');
    });
  });

  describe('Insights', () => {
    test('returns trend information', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(['declining', 'improving', 'stable']).toContain(result.current.insights.trend);
    });

    test('returns current count', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(typeof result.current.insights.currentCount).toBe('number');
    });

    test('returns weekly change when available', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(result.current.insights.weeklyChange).toBe(5);
    });
  });

  describe('Chart Elements', () => {
    test('returns milestones array', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(Array.isArray(result.current.milestones)).toBeTruthy();
      expect(result.current.milestones.length).toBeGreaterThan(0);
      expect(result.current.milestones[0]).toHaveProperty('achieved');
    });

    test('returns points for chart rendering', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(Array.isArray(result.current.points)).toBeTruthy();
      expect(result.current.points[0]).toHaveProperty('x');
      expect(result.current.points[0]).toHaveProperty('y');
      expect(result.current.points[0]).toHaveProperty('count');
    });

    test('returns x-axis labels', () => {
      const { result } = renderHook(() => useMasteryChart([]));

      expect(Array.isArray(result.current.xLabels)).toBeTruthy();
      expect(result.current.xLabels.length).toBeGreaterThan(0);
    });
  });
});
