import { formatDateTo12hClock, formatSecondsToClock, safePercent } from '../../utils/time';

describe('time', () => {
  describe('formatSecondsToClock', () => {
    it('should format seconds to M:SS format', () => {
      expect(formatSecondsToClock(65)).toBe('1:05');
      expect(formatSecondsToClock(125)).toBe('2:05');
      expect(formatSecondsToClock(59)).toBe('0:59');
    });

    it('should handle zero and negative values', () => {
      expect(formatSecondsToClock(0)).toBe('0:00');
      expect(formatSecondsToClock(-5)).toBe('0:00');
    });

    it('should handle large values', () => {
      expect(formatSecondsToClock(3661)).toBe('61:01'); // 1 hour + 1 second
    });

    it('should handle invalid values', () => {
      expect(formatSecondsToClock(NaN)).toBe('0:00');
      expect(formatSecondsToClock(Infinity)).toBe('0:00');
    });
  });

  describe('formatDateTo12hClock', () => {
    it('should format date using native toLocaleTimeString', () => {
      const date = new Date('2024-01-01T14:30:00'); // 2:30 PM
      const formatted = formatDateTo12hClock(date);

      // Verify it contains the expected components (native formatting may vary)
      expect(formatted).toContain('2');
      expect(formatted).toContain('30');
      expect(formatted).toContain('PM');
    });

    it('should handle midnight and noon', () => {
      const midnight = new Date('2024-01-01T00:00:00');
      const noon = new Date('2024-01-01T12:00:00');

      const midnightFormatted = formatDateTo12hClock(midnight);
      const noonFormatted = formatDateTo12hClock(noon);

      expect(midnightFormatted).toContain('12');
      expect(midnightFormatted).toContain('AM');
      expect(noonFormatted).toContain('12');
      expect(noonFormatted).toContain('PM');
    });
  });

  describe('safePercent', () => {
    it('should calculate percentage correctly', () => {
      expect(safePercent(50, 100)).toBe(50);
      expect(safePercent(25, 200)).toBe(12.5);
      expect(safePercent(0, 100)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(safePercent(100, 100)).toBe(100);
      expect(safePercent(150, 100)).toBe(100); // Should not exceed 100
      expect(safePercent(-10, 100)).toBe(0); // Negative position
    });

    it('should handle invalid inputs', () => {
      expect(safePercent(50, 0)).toBe(0); // Division by zero
      expect(safePercent(50, -10)).toBe(0); // Negative duration
      expect(safePercent(NaN, 100)).toBe(0); // Invalid position
      expect(safePercent(50, NaN)).toBe(0); // Invalid duration
      expect(safePercent(Infinity, 100)).toBe(0); // Infinite position
      expect(safePercent(50, Infinity)).toBe(0); // Infinite duration
    });

    it('should handle null/undefined values', () => {
      expect(safePercent(null as any, 100)).toBe(0);
      expect(safePercent(50, null as any)).toBe(0);
      expect(safePercent(undefined as any, 100)).toBe(0);
      expect(safePercent(50, undefined as any)).toBe(0);
    });
  });
});
