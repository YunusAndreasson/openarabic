import { renderHook } from '@testing-library/react-native';
import { useMemoryCapacityGauge, CAPACITY_THRESHOLDS } from '../../../hooks/vocabulary/useMemoryCapacityGauge';

// Mock color hooks to return deterministic colors
jest.mock('../../../hooks/theme/useColors', () => ({
  useColors: () => ({
    error: '#f00',
    warning: '#ff0',
    info: '#0ff',
    success: '#0f0',
  }),
}));

jest.mock('../../../components/vocabulary/shared/chartColors', () => ({
  useChartColors: () => ({
    performance: {
      excellent: '#e',
      good: '#g',
      moderate: '#m',
      poor: '#p',
    },
  }),
}));

describe('useMemoryCapacityGauge', () => {
  const baseProps = {
    width: 200,
    height: 100,
    radius: 50,
    strokeWidth: 10,
  } as const;

  it('returns default metrics when no words provided', () => {
    const { result } = renderHook(() =>
      useMemoryCapacityGauge({ ...baseProps, studyWords: [] })
    );

    expect(result.current.memoryMetrics).toEqual({ capacityScore: 85, trend: 'stable' });
    expect(result.current.gaugePaths.filledSweep).toBeCloseTo(144.5);
  });

  it('calculates metrics and positions for valid words', () => {
    const now = Date.now();
    const words = [
      {
        root_id: 1,
        user_id: 'u',
        created_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
        fsrs_due: null,
        fsrs_stability: 15,
        fsrs_difficulty: 8,
        fsrs_elapsed_days: 0,
        fsrs_scheduled_days: 0,
        fsrs_learning_steps: 0,
        fsrs_reps: 4,
        fsrs_lapses: 0,
        fsrs_state: 0,
        fsrs_last_review: null,
      },
      {
        root_id: 2,
        user_id: 'u',
        created_at: new Date(now - 10 * 24 * 3600 * 1000).toISOString(),
        fsrs_due: null,
        fsrs_stability: 5,
        fsrs_difficulty: 6,
        fsrs_elapsed_days: 0,
        fsrs_scheduled_days: 0,
        fsrs_learning_steps: 0,
        fsrs_reps: 2,
        fsrs_lapses: 0,
        fsrs_state: 0,
        fsrs_last_review: null,
      },
    ];

    const { result } = renderHook(() =>
      useMemoryCapacityGauge({ ...baseProps, studyWords: words })
    );

    expect(result.current.memoryMetrics).toEqual({ capacityScore: 32, trend: 'improving' });
    expect(result.current.gaugePaths.filledSweep).toBeCloseTo(54.4);
    expect(result.current.indicatorPosition.x).toBeCloseTo(70.715, 2);
    expect(result.current.indicatorPosition.y).toBeCloseTo(119.167, 2);
  });

  it('maps score to colors and messages', () => {
    const { result } = renderHook(() =>
      useMemoryCapacityGauge({ ...baseProps, studyWords: [] })
    );

    const { getCapacityColor, getReadinessMessage, getFilledGradientColors, getFilledGradientPositions } = result.current;

    expect(getCapacityColor(80)).toBe('#e');
    expect(getCapacityColor(60)).toBe('#g');
    expect(getCapacityColor(40)).toBe('#m');
    expect(getCapacityColor(10)).toBe('#p');

    expect(getReadinessMessage(80)).toBe('Add new words');
    expect(getReadinessMessage(60)).toBe('Add words moderately');
    expect(getReadinessMessage(40)).toBe('Review before adding');
    expect(getReadinessMessage(10)).toBe('Focus on reviews only');

    expect(getFilledGradientColors(20)).toEqual(['#p', '#m']);
    expect(getFilledGradientColors(50)).toEqual(['#p', '#m', '#g']);
    expect(getFilledGradientColors(80)).toEqual(['#p', '#m', '#g', '#e']);

    expect(getFilledGradientPositions(20)).toEqual([0, 1]);
    expect(getFilledGradientPositions(50)).toEqual([0, 30 / 50, 1]);
    expect(getFilledGradientPositions(80)).toEqual([0, 30 / 80, 70 / 80, 1]);
  });
});
