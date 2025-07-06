import { ReadingStreakService, type DailyReadingActivity } from '@/services/readingStreak';

describe('ReadingStreakService', () => {
  describe('calculateStreak', () => {
    const createActivity = (date: string, hasActivity: boolean = true): DailyReadingActivity => ({
      date,
      articlesRead: hasActivity ? 1 : 0,
      sentencesRead: hasActivity ? 10 : 0,
      hasActivity,
    });

    const today = new Date().toISOString().split('T')[0] as string;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] as string;
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] as string;
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0] as string;

    it('should return zero streak for no activity', () => {
      const activities: DailyReadingActivity[] = [];
      const result = ReadingStreakService.calculateStreak(activities);

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastReadingDate: null,
        streakStartDate: null,
        totalReadingDays: 0,
      });
    });

    it('should calculate current streak when reading today', () => {
      const activities = [
        createActivity(threeDaysAgo, false),
        createActivity(twoDaysAgo),
        createActivity(yesterday),
        createActivity(today),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.currentStreak).toBe(3);
      expect(result.totalReadingDays).toBe(3);
      expect(result.lastReadingDate).toEqual(new Date(today));
    });

    it('should maintain streak when reading yesterday but not today', () => {
      const activities = [
        createActivity(threeDaysAgo),
        createActivity(twoDaysAgo),
        createActivity(yesterday),
        createActivity(today, false),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.currentStreak).toBe(3);
      expect(result.lastReadingDate).toEqual(new Date(yesterday));
    });

    it('should break streak when no reading for 2+ days', () => {
      const activities = [
        createActivity(threeDaysAgo),
        createActivity(twoDaysAgo, false),
        createActivity(yesterday, false),
        createActivity(today, false),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(1);
      expect(result.totalReadingDays).toBe(1);
    });

    it('should calculate longest streak correctly', () => {
      const activities = [
        // First streak: 3 days
        createActivity('2024-01-01'),
        createActivity('2024-01-02'),
        createActivity('2024-01-03'),
        createActivity('2024-01-04', false),
        createActivity('2024-01-05', false),
        // Second streak: 2 days
        createActivity('2024-01-06'),
        createActivity('2024-01-07'),
        createActivity('2024-01-08', false),
        // Current streak: 1 day (yesterday)
        createActivity(yesterday),
        createActivity(today, false),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(3);
      expect(result.totalReadingDays).toBe(6);
    });

    it('should handle mixed activity patterns', () => {
      const activities = [
        createActivity('2024-01-01'),
        createActivity('2024-01-02', false),
        createActivity('2024-01-03'),
        createActivity('2024-01-04'),
        createActivity('2024-01-05', false),
        createActivity('2024-01-06'),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.longestStreak).toBe(2); // Days 3-4
      expect(result.totalReadingDays).toBe(4);
    });

    it('should handle single day activity', () => {
      const activities = [createActivity(yesterday)];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.totalReadingDays).toBe(1);
      expect(result.lastReadingDate).toEqual(new Date(yesterday));
    });

    it('should handle consecutive days with gaps', () => {
      const activities = [
        createActivity('2024-01-01'),
        createActivity('2024-01-02'),
        createActivity('2024-01-03', false),
        createActivity('2024-01-04', false),
        createActivity('2024-01-05'),
        createActivity('2024-01-06'),
        createActivity('2024-01-07'),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.longestStreak).toBe(3); // Days 5-7
      expect(result.totalReadingDays).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid dates gracefully', () => {
      const activities = [
        {
          date: 'invalid-date',
          articlesRead: 1,
          sentencesRead: 10,
          hasActivity: true,
        },
      ];

      expect(() => ReadingStreakService.calculateStreak(activities)).not.toThrow();
    });

    it('should handle empty activity arrays', () => {
      const result = ReadingStreakService.calculateStreak([]);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalReadingDays).toBe(0);
    });
  });
});
