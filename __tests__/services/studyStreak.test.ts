/**
 * Service Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: test.concurrent() used where tests are independent
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import {
  ReadingStreakService,
  StudySessionStreakService,
  type DailyReadingActivity,
} from '../../services/studyStreak';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = require('@/services/supabase');

// The service pages through results with `.range()` after `.eq()`, so the
// mocked terminal value must be chainable (`.range()` returns the same
// awaitable) as well as directly awaitable, matching Supabase's real builder.
const chainableResult = (promise: Promise<any>) =>
  Object.assign(promise, { range: jest.fn(() => promise) });

// Helper to create query builder chain for SELECT queries
const createSelectBuilder = (response: any = { data: [], error: null }) => {
  const promise = chainableResult(Promise.resolve(response));
  const selectFn = jest.fn();
  const eqFn = jest.fn(() => promise);

  selectFn.mockReturnValue({ eq: eqFn });

  const builder: any = { select: selectFn };

  return { builder, selectFn, eqFn };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('StudyStreakService', () => {
  describe('calculateStreak', () => {
    const createActivity = (date: string, hasActivity: boolean = true): DailyReadingActivity => ({
      date,
      hasActivity,
    });

    const today = new Date().toISOString().split('T')[0] as string;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] as string;
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] as string;
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0] as string;

    test('should return zero streak for no activity', () => {
      const activities: DailyReadingActivity[] = [];
      const result = ReadingStreakService.calculateStreak(activities);

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastReadingDate: null,
        totalReadingDays: 0,
      });
    });

    test('should calculate current streak when reading today', () => {
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

    test('should maintain streak when reading yesterday but not today', () => {
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

    test('should break streak when no reading for 2+ days', () => {
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

    test('should calculate longest streak correctly', () => {
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

    test('should handle mixed activity patterns', () => {
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

    test('should handle single day activity', () => {
      const activities = [createActivity(yesterday)];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.totalReadingDays).toBe(1);
      expect(result.lastReadingDate).toEqual(new Date(yesterday));
    });

    test('should handle consecutive days with gaps', () => {
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
    test('should handle invalid dates gracefully', () => {
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

    test('should handle empty activity arrays', () => {
      const result = ReadingStreakService.calculateStreak([]);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalReadingDays).toBe(0);
    });
  });

  describe('calculateStreakPeriods', () => {
    const createActivity = (date: string, hasActivity: boolean = true): DailyReadingActivity => ({
      date,
      hasActivity,
    });

    const today = new Date().toISOString().split('T')[0] as string;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] as string;

    test('should return empty array for no activity', () => {
      const result = ReadingStreakService.calculateStreakPeriods([]);

      expect(result).toEqual([]);
    });

    test('should return empty array when all activities are inactive', () => {
      const activities = [
        createActivity('2024-01-01', false),
        createActivity('2024-01-02', false),
        createActivity('2024-01-03', false),
      ];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toEqual([]);
    });

    test('should create single period for consecutive days', () => {
      const activities = [
        createActivity('2024-01-01'),
        createActivity('2024-01-02'),
        createActivity('2024-01-03'),
      ];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        startDate: '2024-01-01',
        endDate: '2024-01-03',
        length: 3,
      });
    });

    test('should create multiple periods for gaps', () => {
      const activities = [
        createActivity('2024-01-01'),
        createActivity('2024-01-02'),
        createActivity('2024-01-04', false), // Gap
        createActivity('2024-01-05'),
        createActivity('2024-01-06'),
      ];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        length: 2,
      });
      expect(result[1]).toMatchObject({
        startDate: '2024-01-05',
        endDate: '2024-01-06',
        length: 2,
      });
    });

    test('should mark most recent period as active if ends today', () => {
      const activities = [createActivity(yesterday), createActivity(today)];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(1);
      expect(result[0]?.isActive).toBeTruthy();
    });

    test('should mark most recent period as active if ends yesterday', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] as string;
      const activities = [createActivity(twoDaysAgo), createActivity(yesterday)];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(1);
      expect(result[0]?.isActive).toBeTruthy();
    });

    test('should mark old period as inactive', () => {
      const activities = [createActivity('2024-01-01'), createActivity('2024-01-02')];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(1);
      expect(result[0]?.isActive).toBeFalsy();
    });

    test('should handle single day period', () => {
      const activities = [createActivity('2024-01-01')];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        length: 1,
      });
    });

    test('should handle many small periods', () => {
      const activities = [
        createActivity('2024-01-01'),
        createActivity('2024-01-02', false),
        createActivity('2024-01-03'),
        createActivity('2024-01-04', false),
        createActivity('2024-01-05'),
      ];

      const result = ReadingStreakService.calculateStreakPeriods(activities);

      expect(result).toHaveLength(3);
      expect(result[0]?.length).toBe(1);
      expect(result[1]?.length).toBe(1);
      expect(result[2]?.length).toBe(1);
    });
  });

  describe('date boundary conditions', () => {
    const createActivity = (date: string, hasActivity: boolean = true): DailyReadingActivity => ({
      date,
      hasActivity,
    });

    test('should handle UTC date calculations correctly', () => {
      // Create dates that cross midnight boundaries
      const activities = [createActivity('2024-01-31'), createActivity('2024-02-01')];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.longestStreak).toBe(2);
    });

    test('should handle month boundaries', () => {
      const activities = [
        createActivity('2024-01-30'),
        createActivity('2024-01-31'),
        createActivity('2024-02-01'),
        createActivity('2024-02-02'),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.longestStreak).toBe(4);
    });

    test('should handle year boundaries', () => {
      const activities = [
        createActivity('2023-12-30'),
        createActivity('2023-12-31'),
        createActivity('2024-01-01'),
        createActivity('2024-01-02'),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.longestStreak).toBe(4);
    });

    test('should handle leap year Feb 29', () => {
      const activities = [
        createActivity('2024-02-28'),
        createActivity('2024-02-29'), // Leap day
        createActivity('2024-03-01'),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      expect(result.longestStreak).toBe(3);
    });

    test('should break streak correctly at exactly 1-day gap', () => {
      const activities = [
        createActivity('2024-01-01'),
        createActivity('2024-01-02'),
        // Gap on 2024-01-03
        createActivity('2024-01-04'),
        createActivity('2024-01-05'),
      ];

      const result = ReadingStreakService.calculateStreak(activities);

      // Each streak is 2 days
      expect(result.longestStreak).toBe(2);
    });
  });
});

describe('StudySessionStreakService', () => {
  describe('getDailyStudySessionActivity', () => {
    test('should return activity for specified number of days', async () => {
      const mockData = [{ fsrs_last_review: new Date().toISOString() }];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: mockData, error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getDailyStudySessionActivity('user-123', 7);

      expect(result).toHaveLength(7);
      expect(supabase.from).toHaveBeenCalledWith('study_words');
    });

    test('should mark days with activity correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockData = [
        { fsrs_last_review: today.toISOString() },
        { fsrs_last_review: yesterday.toISOString() },
      ];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: mockData, error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getDailyStudySessionActivity('user-123', 7);

      const activeDays = result.filter(day => day.hasActivity);
      expect(activeDays.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle null fsrs_last_review values', async () => {
      const mockData = [{ fsrs_last_review: null }, { fsrs_last_review: new Date().toISOString() }];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: mockData, error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getDailyStudySessionActivity('user-123', 7);

      expect(result).toHaveLength(7);
      // Should handle null gracefully without throwing
    });

    test('should handle empty data', async () => {
      const { builder, eqFn } = createSelectBuilder({ data: [], error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: [], error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getDailyStudySessionActivity('user-123', 7);

      expect(result).toHaveLength(7);
      expect(result.every(day => !day.hasActivity)).toBeTruthy();
    });
  });

  describe('getStudySessionStreak', () => {
    test('should calculate streak from study activity', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockData = [
        { fsrs_last_review: today.toISOString() },
        { fsrs_last_review: yesterday.toISOString() },
      ];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: mockData, error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getStudySessionStreak('user-123');

      expect(result.currentStreak).toBeGreaterThanOrEqual(1);
      expect(result.totalReadingDays).toBeGreaterThanOrEqual(1);
    });

    test('should return zero streak when no study sessions', async () => {
      const { builder, eqFn } = createSelectBuilder({ data: [], error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: [], error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getStudySessionStreak('user-123');

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalReadingDays).toBe(0);
    });

    test('should handle query errors gracefully', async () => {
      const { builder, eqFn } = createSelectBuilder({ data: null, error: { message: 'DB error' } });
      eqFn.mockReturnValue(chainableResult(Promise.reject(new Error('DB error'))));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getStudySessionStreak('user-123');

      // Should return empty streak on error
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
    });
  });

  describe('getStudySessionHistory', () => {
    test('should return complete history data', async () => {
      const today = new Date();
      const mockData = [{ fsrs_last_review: today.toISOString() }];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: mockData, error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getStudySessionHistory('user-123', 7);

      expect(result).toHaveProperty('dailyActivity');
      expect(result).toHaveProperty('streakPeriods');
      expect(result).toHaveProperty('metrics');
      expect(result.dailyActivity).toHaveLength(7);
    });

    test('should return empty history on error', async () => {
      const { builder, eqFn } = createSelectBuilder({ data: null, error: { message: 'Error' } });
      eqFn.mockReturnValue(chainableResult(Promise.reject(new Error('Error'))));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getStudySessionHistory('user-123', 7);

      expect(result.dailyActivity).toHaveLength(7);
      expect(result.streakPeriods).toEqual([]);
      expect(result.metrics.currentStreak).toBe(0);
    });

    test('should calculate streak periods from activity', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockData = [
        { fsrs_last_review: today.toISOString() },
        { fsrs_last_review: yesterday.toISOString() },
      ];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(chainableResult(Promise.resolve({ data: mockData, error: null })));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await StudySessionStreakService.getStudySessionHistory('user-123', 30);

      expect(result.streakPeriods.length).toBeGreaterThanOrEqual(1);
      expect(result.metrics.totalReadingDays).toBeGreaterThanOrEqual(1);
    });
  });
});
