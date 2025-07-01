import { renderHook } from '@testing-library/react-native';
import { useMemoryCapacityGauge } from '../../../hooks/vocabulary/useMemoryCapacityGauge';

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
    withOpacity: (color: string, opacity: number) => `${color}@${opacity}`, // Mock opacity function
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
    const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));

    expect(result.current.memoryMetrics).toEqual({ capacityScore: 85, trend: 'stable' });
    expect(result.current.gaugePaths.filledSweep).toBeCloseTo(144.5);
  });

  it('calculates metrics and positions for valid words', () => {
    const now = Date.now();
    // Generate more than 50 words with varying stability and difficulty
    const words = Array.from({ length: 60 }, (_, i) => ({
      root_id: i + 1,
      user_id: 'u',
      created_at: new Date(now - (i % 10) * 24 * 3600 * 1000).toISOString(),
      fsrs_due: null,
      fsrs_stability: (i % 30) + 1,
      fsrs_difficulty: (i % 10) + 1,
      fsrs_elapsed_days: 0,
      fsrs_scheduled_days: 0,
      fsrs_learning_steps: 0,
      fsrs_reps: (i % 5) + 1,
      fsrs_lapses: 0,
      fsrs_state: 0,
      fsrs_last_review: null,
    }));

    const { result } = renderHook(() =>
      useMemoryCapacityGauge({ ...baseProps, studyWords: words })
    );

    expect(result.current.memoryMetrics).toEqual({ capacityScore: 44, trend: 'improving' });
    expect(result.current.gaugePaths.filledSweep).toBeCloseTo(74.8);
    expect(result.current.indicatorPosition.x).toBeCloseTo(84.462, 2);
    expect(result.current.indicatorPosition.y).toBeCloseTo(127.232, 2);
  });

  it('maps score to colors and messages for 3-phase system', () => {
    const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));

    const {
      getCapacityColor,
      getReadinessMessage,
      getActionCardBackground,
      getFilledGradientColors,
      getFilledGradientPositions,
    } = result.current;

    // Test 3-phase color system: Green (Ready), Yellow (Caution), Red (Don't Add)

    // Green zone (Ready) - 70% and above
    expect(getCapacityColor(85)).toBe('#e'); // excellent (green)
    expect(getCapacityColor(70)).toBe('#e'); // excellent (green)

    // Yellow zone (Caution) - 40% to 69%
    expect(getCapacityColor(60)).toBe('#m'); // moderate (yellow/orange)
    expect(getCapacityColor(40)).toBe('#m'); // moderate (yellow/orange)

    // Red zone (Don't Add) - below 40%
    expect(getCapacityColor(30)).toBe('#p'); // poor (red)
    expect(getCapacityColor(10)).toBe('#p'); // poor (red)

    // Test edge cases
    expect(getCapacityColor(100)).toBe('#e'); // excellent (green)
    expect(getCapacityColor(0)).toBe('#p'); // poor (red)

    // Test readiness message for empty study words (should be green zone)
    expect(getReadinessMessage()).toBe('High Memory Capacity');

    // Test action card background matches gauge color with light opacity
    // These should be light tints of the gauge colors
    expect(getActionCardBackground(85)).toBeDefined();
    expect(getActionCardBackground(50)).toBeDefined();
    expect(getActionCardBackground(20)).toBeDefined();

    // Test gradient colors - these use internal visual score, not parameters
    // For empty study words, visual score defaults to 85 (green zone)
    expect(getFilledGradientColors()).toEqual(['#p', '#m', '#g', '#e']);
    expect(getFilledGradientPositions()).toEqual([0, 30 / 85, 70 / 85, 1]);
  });

  describe('3-phase readiness scenarios', () => {
    it('handles GREEN zone - Ready to add words (70%+)', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor, getReadinessMessage, getActionCardBackground } = result.current;

      const scores = [70, 80, 90, 100];
      scores.forEach(score => {
        expect(getCapacityColor(score)).toBe('#e'); // Green
        expect(getActionCardBackground(score)).toBeDefined();
      });
      // For empty study words, should always be ready for new words
      expect(getReadinessMessage()).toBe('High Memory Capacity');
    });

    it('handles YELLOW zone - Practice more first (40-69%)', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor, getReadinessMessage, getActionCardBackground } = result.current;

      const scores = [40, 50, 60, 69];
      scores.forEach(score => {
        expect(getCapacityColor(score)).toBe('#m'); // Yellow/Orange
        expect(getActionCardBackground(score)).toBeDefined();
      });
      // For empty study words, should always be ready for new words (no struggling words)
      expect(getReadinessMessage()).toBe('High Memory Capacity');
    });

    it('handles RED zone - Practice current words first (<40%)', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor, getReadinessMessage, getActionCardBackground } = result.current;

      const scores = [0, 10, 20, 30, 39];
      scores.forEach(score => {
        expect(getCapacityColor(score)).toBe('#p'); // Red
        expect(getActionCardBackground(score)).toBeDefined();
      });
      // For empty study words, should always be ready for new words (no due words)
      expect(getReadinessMessage()).toBe('High Memory Capacity');
    });
  });

  describe('text color mapping for zones', () => {
    it('uses GREEN color for text in ready zone (70%+)', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor } = result.current;

      // Test various scores in green zone
      expect(getCapacityColor(70)).toBe('#e'); // exactly at threshold
      expect(getCapacityColor(75)).toBe('#e'); // mid-range
      expect(getCapacityColor(85)).toBe('#e'); // high
      expect(getCapacityColor(100)).toBe('#e'); // maximum
    });

    it('uses YELLOW/ORANGE color for text in caution zone (40-69%)', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor } = result.current;

      // Test various scores in yellow zone
      expect(getCapacityColor(40)).toBe('#m'); // exactly at threshold
      expect(getCapacityColor(50)).toBe('#m'); // mid-range
      expect(getCapacityColor(60)).toBe('#m'); // high end
      expect(getCapacityColor(69)).toBe('#m'); // just before green
    });

    it('uses RED color for text in practice zone (<40%)', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor } = result.current;

      // Test various scores in red zone
      expect(getCapacityColor(0)).toBe('#p'); // minimum
      expect(getCapacityColor(10)).toBe('#p'); // low
      expect(getCapacityColor(25)).toBe('#p'); // mid-range
      expect(getCapacityColor(39)).toBe('#p'); // just before yellow
    });

    it('has consistent color-message mapping across all zones', () => {
      const { result } = renderHook(() => useMemoryCapacityGauge({ ...baseProps, studyWords: [] }));
      const { getCapacityColor, getReadinessMessage } = result.current;

      // Test colors for different scores
      expect(getCapacityColor(80)).toBe('#e'); // Green zone
      expect(getCapacityColor(55)).toBe('#m'); // Yellow zone
      expect(getCapacityColor(25)).toBe('#p'); // Red zone

      // For empty study words, message should always be ready for new words
      expect(getReadinessMessage()).toBe('High Memory Capacity');
    });
  });
});
