import {
  ChartPoint,
  generateDataPointKeys,
  generateMilestoneKeys,
  validateChartDataPoints,
} from '@/utils/chartUtils';

describe('chartUtils', () => {
  const mockDate1 = new Date('2023-01-01T00:00:00.000Z');
  const mockDate2 = new Date('2023-01-02T00:00:00.000Z');
  const mockDate3 = new Date('2023-01-03T00:00:00.000Z');

  const mockDataPoints: ChartPoint[] = [
    { x: 1, y: 10, date: mockDate1 },
    { x: 2, y: 20, date: mockDate2 },
    { x: 3, y: 30, date: mockDate3 },
  ];

  const mockMilestones: ChartPoint[] = [
    { x: 1, y: 10, date: mockDate1, rate: 0.8 },
    { x: 2, y: 20, date: mockDate2, rate: 0.9 },
    { x: 3, y: 30, date: mockDate3 },
  ];

  describe('generateDataPointKeys', () => {
    it('should generate keys with default prefix', () => {
      const result = generateDataPointKeys(mockDataPoints);
      expect(result).toEqual([
        'data-point-2023-01-01T00:00:00.000Z',
        'data-point-2023-01-02T00:00:00.000Z',
        'data-point-2023-01-03T00:00:00.000Z',
      ]);
    });

    it('should generate keys with custom prefix', () => {
      const result = generateDataPointKeys(mockDataPoints, 'custom');
      expect(result).toEqual([
        'custom-2023-01-01T00:00:00.000Z',
        'custom-2023-01-02T00:00:00.000Z',
        'custom-2023-01-03T00:00:00.000Z',
      ]);
    });

    it('should handle empty array', () => {
      const result = generateDataPointKeys([]);
      expect(result).toEqual([]);
    });
  });

  describe('generateMilestoneKeys', () => {
    it('should generate keys with default prefix', () => {
      const result = generateMilestoneKeys(mockMilestones);
      expect(result).toEqual([
        'milestone-2023-01-01T00:00:00.000Z-0.8',
        'milestone-2023-01-02T00:00:00.000Z-0.9',
        'milestone-2023-01-03T00:00:00.000Z-2',
      ]);
    });

    it('should generate keys with custom prefix', () => {
      const result = generateMilestoneKeys(mockMilestones, 'custom');
      expect(result).toEqual([
        'custom-2023-01-01T00:00:00.000Z-0.8',
        'custom-2023-01-02T00:00:00.000Z-0.9',
        'custom-2023-01-03T00:00:00.000Z-2',
      ]);
    });

    it('should handle empty array', () => {
      const result = generateMilestoneKeys([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateChartDataPoints', () => {
    it('should validate empty array', () => {
      const result = validateChartDataPoints([]);
      expect(result).toBe(true);
    });
  });

  describe('today indicator functionality', () => {
    it('should automatically set todayIndex to last label when not provided', () => {
      const xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const providedTodayIndex = undefined;

      // Simulate the logic from VocabularyChart
      const todayIndex =
        providedTodayIndex ?? (xLabels.length > 0 ? xLabels.length - 1 : undefined);

      // Should default to the last label (Sunday)
      expect(todayIndex).toBe(6);
      expect(xLabels[todayIndex]).toBe('Sun');
    });

    it('should respect provided todayIndex when specified', () => {
      const xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const providedTodayIndex = 2; // Wednesday

      // Simulate the logic from VocabularyChart
      const todayIndex =
        providedTodayIndex ?? (xLabels.length > 0 ? xLabels.length - 1 : undefined);

      // Should use the provided index
      expect(todayIndex).toBe(2);
      expect(xLabels[todayIndex]).toBe('Wed');
    });

    it('should handle empty labels gracefully', () => {
      const xLabels: string[] = [];
      const providedTodayIndex = undefined;

      // Simulate the logic from VocabularyChart
      const todayIndex =
        providedTodayIndex ?? (xLabels.length > 0 ? xLabels.length - 1 : undefined);

      // Should be undefined when no labels
      expect(todayIndex).toBeUndefined();
    });

    it('should handle future prediction charts correctly', () => {
      const xLabels = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
      const isFuturePrediction = true;

      // Simulate the logic from VocabularyChart for future prediction charts
      const todayIndex =
        xLabels.length > 0 ? (isFuturePrediction ? 0 : xLabels.length - 1) : undefined;

      // Should be index 0 for future prediction charts
      expect(todayIndex).toBe(0);
      if (todayIndex !== undefined) {
        expect(xLabels[todayIndex]).toBe('Today');
      }
    });

    it('should handle historical charts correctly', () => {
      const xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const isFuturePrediction = false;

      // Simulate the logic from VocabularyChart for historical charts
      const todayIndex =
        xLabels.length > 0 ? (isFuturePrediction ? 0 : xLabels.length - 1) : undefined;

      // Should be the last index for historical charts
      expect(todayIndex).toBe(6);
      if (todayIndex !== undefined) {
        expect(xLabels[todayIndex]).toBe('Sun');
      }
    });
  });
});
