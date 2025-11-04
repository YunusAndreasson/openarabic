import { calculateReadingTime } from '@/utils/textUtils';

describe('textUtils', () => {
  describe('calculateReadingTime', () => {
    it('should return "1m" minimum for 0 sentences', () => {
      expect(calculateReadingTime(0)).toBe('1m');
    });

    it('should return "1m" for 1-9 sentences (rounds up)', () => {
      expect(calculateReadingTime(1)).toBe('1m');
      expect(calculateReadingTime(5)).toBe('1m');
      expect(calculateReadingTime(9)).toBe('1m');
    });

    it('should return "2m" for 10-18 sentences', () => {
      expect(calculateReadingTime(10)).toBe('2m');
      expect(calculateReadingTime(14)).toBe('2m');
      expect(calculateReadingTime(18)).toBe('2m');
    });

    it('should return "3m" for 19-27 sentences', () => {
      expect(calculateReadingTime(19)).toBe('3m');
      expect(calculateReadingTime(23)).toBe('3m');
      expect(calculateReadingTime(27)).toBe('3m');
    });

    it('should return "13m" for 117 sentences', () => {
      expect(calculateReadingTime(117)).toBe('13m');
    });

    it('should return "22m" for 195 sentences', () => {
      expect(calculateReadingTime(195)).toBe('22m');
    });

    it('should handle very large sentence counts', () => {
      expect(calculateReadingTime(270)).toBe('30m');
      expect(calculateReadingTime(540)).toBe('60m');
    });

    it('should round up to nearest minute', () => {
      // 10 sentences = 1.11 minutes, should round to 2m
      expect(calculateReadingTime(10)).toBe('2m');

      // 37 sentences = 4.11 minutes, should round to 5m
      expect(calculateReadingTime(37)).toBe('5m');
    });

    it('should handle negative numbers gracefully', () => {
      expect(calculateReadingTime(-5)).toBe('1m');
    });
  });
});
