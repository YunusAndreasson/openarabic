import { calculateReadingTime } from '@/utils/textUtils';

describe('textUtils', () => {
  describe('calculateReadingTime', () => {
    it('should return "1m" minimum for 0 sentences', () => {
      expect(calculateReadingTime(0)).toBe('1m');
    });

    it('should return "1m" for 1-6 sentences (rounds up)', () => {
      expect(calculateReadingTime(1)).toBe('1m');
      expect(calculateReadingTime(3)).toBe('1m');
      expect(calculateReadingTime(6)).toBe('1m');
    });

    it('should return "2m" for 7-12 sentences', () => {
      expect(calculateReadingTime(7)).toBe('2m');
      expect(calculateReadingTime(10)).toBe('2m');
      expect(calculateReadingTime(12)).toBe('2m');
    });

    it('should return "3m" for 13-18 sentences', () => {
      expect(calculateReadingTime(13)).toBe('3m');
      expect(calculateReadingTime(15)).toBe('3m');
      expect(calculateReadingTime(18)).toBe('3m');
    });

    it('should return "20m" for 120 sentences', () => {
      expect(calculateReadingTime(120)).toBe('20m');
    });

    it('should return "33m" for 195 sentences', () => {
      expect(calculateReadingTime(195)).toBe('33m');
    });

    it('should handle very large sentence counts', () => {
      expect(calculateReadingTime(270)).toBe('45m');
      expect(calculateReadingTime(540)).toBe('90m');
    });

    it('should round up to nearest minute', () => {
      // 7 sentences = 1.17 minutes, should round to 2m
      expect(calculateReadingTime(7)).toBe('2m');

      // 25 sentences = 4.17 minutes, should round to 5m
      expect(calculateReadingTime(25)).toBe('5m');
    });

    it('should handle negative numbers gracefully', () => {
      expect(calculateReadingTime(-5)).toBe('1m');
    });
  });
});
