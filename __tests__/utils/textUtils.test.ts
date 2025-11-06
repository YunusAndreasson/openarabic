import { calculateReadingTime } from '@/utils/textUtils';

describe('textUtils', () => {
  describe('calculateReadingTime', () => {
    it('should return "1m" minimum for 0 sentences', () => {
      expect(calculateReadingTime(0)).toBe('1m');
    });

    it('should return "1m" for 1-4 sentences (rounds up)', () => {
      expect(calculateReadingTime(1)).toBe('1m');
      expect(calculateReadingTime(3)).toBe('1m');
      expect(calculateReadingTime(4)).toBe('1m');
    });

    it('should return "2m" for 5-8 sentences', () => {
      expect(calculateReadingTime(5)).toBe('2m');
      expect(calculateReadingTime(7)).toBe('2m');
      expect(calculateReadingTime(8)).toBe('2m');
    });

    it('should return "3m" for 9-12 sentences', () => {
      expect(calculateReadingTime(9)).toBe('3m');
      expect(calculateReadingTime(10)).toBe('3m');
      expect(calculateReadingTime(12)).toBe('3m');
    });

    it('should return "30m" for 120 sentences', () => {
      expect(calculateReadingTime(120)).toBe('30m');
    });

    it('should return "49m" for 195 sentences', () => {
      expect(calculateReadingTime(195)).toBe('49m');
    });

    it('should handle very large sentence counts', () => {
      expect(calculateReadingTime(270)).toBe('68m');
      expect(calculateReadingTime(540)).toBe('135m');
    });

    it('should round up to nearest minute', () => {
      // 7 sentences = 1.75 minutes, should round to 2m
      expect(calculateReadingTime(7)).toBe('2m');

      // 25 sentences = 6.25 minutes, should round to 7m
      expect(calculateReadingTime(25)).toBe('7m');
    });

    it('should handle negative numbers gracefully', () => {
      expect(calculateReadingTime(-5)).toBe('1m');
    });
  });
});
