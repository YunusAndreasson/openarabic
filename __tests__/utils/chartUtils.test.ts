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
});
