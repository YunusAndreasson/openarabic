/**
 * useRetrievabilityChart Hook Tests
 *
 * Tests retrievability chart data calculation and insights.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ Shared mock values from helpers/chartMocks.ts
 * - ✅ jest.mocked() for type-safe mocking
 */

import { renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { resetChartMocks } from '@/__tests__/helpers/chartMocks';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { StudyWord } from '@/types/vocabulary.types';

// Chart mocks - using shared mock values but inline jest.mock() for hoisting
jest.mock('@/components/common/charts/ChartColors', () => ({
  useChartColors: () => require('@/__tests__/helpers/chartMocks').mockChartColors,
}));

jest.mock('@/components/common/charts/constants', () => ({
  CHART_VISUAL: { CHART_TOP_PADDING: 10 },
  DAYS_7: 7,
  GRAPH_HEIGHT_LARGE: 200,
  getEffectiveChartHeight: () => 180,
  calculateDataPointPositions: (count: number) =>
    Array.from({ length: count }, (_, i) => (i / (count - 1 || 1)) * 300),
}));

jest.mock('@/components/common/charts/pathBuilder', () => ({
  buildSmoothChartPath: ({ data, buildPoint }: any) => ({
    path: data.length > 0 ? 'M0,0 L100,100' : '',
    points: data.map((d: any, i: number) => buildPoint(i * 50, 100, d)),
  }),
}));

jest.mock('@/components/common/charts/utils', () => ({
  createStandardizedPerformanceZones: () =>
    require('@/__tests__/helpers/chartMocks').mockPerformanceZones,
}));

jest.mock('@/utils/fsrsUtils', () => ({
  calculateRetrievabilityForecast: (words: StudyWord[], days: number) => {
    if (words.length === 0) return [];
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      averageRetrievability: 80 - i * 5, // Declining
      criticalWords: i,
    }));
  },
  calculateRetrievabilityTrend: (data: any[]) => {
    if (data.length < 2) return 'stable';
    const first = data[0]?.averageRetrievability || 0;
    const last = data[data.length - 1]?.averageRetrievability || 0;
    if (first > last + 10) return 'improving';
    if (first < last - 10) return 'declining';
    return 'stable';
  },
}));

describe('useRetrievabilityChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetChartMocks();
  });

  describe('Empty State', () => {
    test('returns empty chart data for empty word list', () => {
      const { result } = renderHook(() => useRetrievabilityChart([]));

      expect(result.current.retrievabilityData).toEqual([]);
      expect(result.current.chartData.hasData).toBe(false);
      expect(result.current.chartData.retrievabilityPath).toBe('');
      expect(result.current.chartData.dataPoints).toEqual([]);
    });

    test('returns default insights for empty state', () => {
      const { result } = renderHook(() => useRetrievabilityChart([]));

      expect(result.current.chartData.insights).toEqual({
        currentRetrievability: 0,
        trend: 'stable',
        criticalWords: 0,
      });
    });
  });

  describe('With Study Words', () => {
    test('calculates retrievability forecast for words', () => {
      const words = [
        createTestWord({ fsrs_state: 2, fsrs_stability: 5 }),
        createTestWord({ fsrs_state: 2, fsrs_stability: 3 }),
      ];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(result.current.retrievabilityData.length).toBeGreaterThan(0);
      expect(result.current.chartData.hasData).toBe(true);
    });

    test('generates chart path for valid data', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(result.current.chartData.retrievabilityPath).not.toBe('');
    });

    test('calculates data points with coordinates', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(result.current.chartData.dataPoints.length).toBeGreaterThan(0);
      expect(result.current.chartData.dataPoints[0]).toHaveProperty('x');
      expect(result.current.chartData.dataPoints[0]).toHaveProperty('y');
      expect(result.current.chartData.dataPoints[0]).toHaveProperty('retrievability');
    });

    test('provides danger zones for chart', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(result.current.chartData.dangerZones.length).toBeGreaterThan(0);
    });
  });

  describe('Insights Calculation', () => {
    test('provides current retrievability insight', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(typeof result.current.chartData.insights.currentRetrievability).toBe('number');
      expect(result.current.chartData.insights.currentRetrievability).toBeGreaterThanOrEqual(0);
      expect(result.current.chartData.insights.currentRetrievability).toBeLessThanOrEqual(100);
    });

    test('provides trend insight', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(['improving', 'declining', 'stable']).toContain(
        result.current.chartData.insights.trend,
      );
    });

    test('provides critical words count', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result } = renderHook(() => useRetrievabilityChart(words));

      expect(typeof result.current.chartData.insights.criticalWords).toBe('number');
      expect(result.current.chartData.insights.criticalWords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memoization', () => {
    test('returns consistent data for same input', () => {
      const words = [createTestWord({ fsrs_state: 2, fsrs_stability: 5 })];

      const { result, rerender } = renderHook(() => useRetrievabilityChart(words));

      const firstData = result.current.retrievabilityData;

      rerender();

      // Data values should be consistent when input hasn't changed
      expect(result.current.retrievabilityData).toStrictEqual(firstData);
    });
  });
});
