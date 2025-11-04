import { calculateReadingTime } from '@/utils/textUtils';

describe('textUtils', () => {
  describe('calculateReadingTime', () => {
    it('should return "1m" minimum for 0 sentences', () => {
      expect(calculateReadingTime(0)).toBe('1m');
    });

    it('should return "1m" for 1-13 sentences (rounds up)', () => {
      expect(calculateReadingTime(1)).toBe('1m');
      expect(calculateReadingTime(6)).toBe('1m');
      expect(calculateReadingTime(12)).toBe('1m');
      expect(calculateReadingTime(13)).toBe('1m');
    });

    it('should return "2m" for 14-26 sentences', () => {
      expect(calculateReadingTime(14)).toBe('2m');
      expect(calculateReadingTime(20)).toBe('2m');
      expect(calculateReadingTime(26)).toBe('2m');
    });

    it('should return "3m" for 27-39 sentences', () => {
      expect(calculateReadingTime(27)).toBe('3m');
      expect(calculateReadingTime(30)).toBe('3m');
      expect(calculateReadingTime(39)).toBe('3m');
    });

    it('should return "10m" for 130 sentences', () => {
      expect(calculateReadingTime(130)).toBe('10m');
    });

    it('should return "15m" for 195 sentences', () => {
      expect(calculateReadingTime(195)).toBe('15m');
    });

    it('should handle very large sentence counts', () => {
      expect(calculateReadingTime(260)).toBe('20m');
      expect(calculateReadingTime(520)).toBe('40m');
    });

    it('should round up to nearest minute', () => {
      // 14 sentences = 1.08 minutes, should round to 2m
      expect(calculateReadingTime(14)).toBe('2m');

      // 40 sentences = 3.08 minutes, should round to 4m
      expect(calculateReadingTime(40)).toBe('4m');
    });

    it('should handle negative numbers gracefully', () => {
      expect(calculateReadingTime(-5)).toBe('1m');
    });
  });
});
