import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import { toUTCDateString } from '@/utils/dateTimeUtils';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  activity: createServiceErrorConfig('study_session_activity', 'load', {
    toastMessage: STRINGS.ERROR_LOADING_DATA,
    showToast: false,
  }),
};

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadingDate: Date | null;
  totalReadingDays: number;
}

export interface DailyReadingActivity {
  date: string; // YYYY-MM-DD format
  hasActivity: boolean;
}

export interface StreakPeriod {
  startDate: string;
  endDate: string;
  length: number;
  isActive: boolean;
}

export interface StreakHistoryData {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
  metrics: {
    currentStreak: number;
    longestStreak: number;
    totalReadingDays: number;
  };
}

export class ReadingStreakService {
  /**
   * Calculate reading streak from daily activity data
   */
  static calculateStreak(activities: DailyReadingActivity[]): ReadingStreak {
    const today = new Date();
    const todayStr = toUTCDateString(today);

    const activeDays = activities.filter(day => day.hasActivity);

    if (activeDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadingDate: null,
        totalReadingDays: 0,
      };
    }

    const sortedActiveDays = activeDays.sort((a, b) => a.date.localeCompare(b.date));
    const mostRecentDate = sortedActiveDays[sortedActiveDays.length - 1]?.date;
    const lastReadingDate = new Date(mostRecentDate || '');

    // Calculate current streak
    let currentStreak = 0;
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = toUTCDateString(yesterday);

    const hasRecentActivity =
      mostRecentDate && (mostRecentDate === todayStr || mostRecentDate === yesterdayStr);

    if (hasRecentActivity) {
      const activeDatesSet = new Set(sortedActiveDays.map(a => a.date));
      const currentDate = new Date(mostRecentDate);

      while (true) {
        const dateStr = toUTCDateString(currentDate);
        if (dateStr && activeDatesSet.has(dateStr)) {
          currentStreak++;
          currentDate.setUTCDate(currentDate.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const allActivities = activities.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < allActivities.length; i++) {
      const activity = allActivities[i];
      if (activity?.hasActivity) {
        const prevActivity = allActivities[i - 1];
        if (i === 0 || !prevActivity?.hasActivity) {
          tempStreak = 1;
        } else {
          const prevDate = new Date(prevActivity.date);
          const currentDate = new Date(activity.date);
          const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

          if (dayDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastReadingDate,
      totalReadingDays: activeDays.length,
    };
  }

  /**
   * Calculate streak periods for visualization
   */
  static calculateStreakPeriods(activities: DailyReadingActivity[]): StreakPeriod[] {
    const periods: StreakPeriod[] = [];
    const activeDays = activities.filter(day => day.hasActivity);

    if (activeDays.length === 0) return periods;

    const sortedDays = activeDays.sort((a, b) => a.date.localeCompare(b.date));
    let currentPeriod: { start: string; end: string; dates: string[] } | null = null;

    for (const day of sortedDays) {
      if (!currentPeriod) {
        currentPeriod = { start: day.date, end: day.date, dates: [day.date] };
      } else {
        const lastDate = new Date(currentPeriod.end);
        const currentDate = new Date(day.date);
        const dayDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          currentPeriod.end = day.date;
          currentPeriod.dates.push(day.date);
        } else {
          // End current period and start new one
          periods.push({
            startDate: currentPeriod.start,
            endDate: currentPeriod.end,
            length: currentPeriod.dates.length,
            isActive: false,
          });
          currentPeriod = { start: day.date, end: day.date, dates: [day.date] };
        }
      }
    }

    // Add the last period
    if (currentPeriod) {
      periods.push({
        startDate: currentPeriod.start,
        endDate: currentPeriod.end,
        length: currentPeriod.dates.length,
        isActive: false,
      });
    }

    // Mark the most recent period as active if it's current
    if (periods.length > 0) {
      const lastPeriod = periods[periods.length - 1];
      const today = new Date();
      const todayStr = toUTCDateString(today);

      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = toUTCDateString(yesterday);

      if (lastPeriod && (lastPeriod.endDate === todayStr || lastPeriod.endDate === yesterdayStr)) {
        lastPeriod.isActive = true;
      }
    }

    return periods;
  }
}

/**
 * Study Session Streak Service
 * Tracks daily study session completion for motivating consistent practice
 */
export class StudySessionStreakService {
  /**
   * Get daily study session activity for a user over a specified period
   * Uses study_words table fsrs_last_review timestamps to track study sessions
   */
  static async getDailyStudySessionActivity(
    userId: string,
    days: number = 30,
  ): Promise<DailyReadingActivity[]> {
    const endDate = new Date();
    const startDate = new Date();
    // Go back (days - 1) to include today as the last day
    startDate.setDate(startDate.getDate() - (days - 1));

    // Get all study_words reviews for the user (fsrs_last_review tracks when they studied)
    const data = await executeQuery(
      () => supabase.from('study_words').select('fsrs_last_review').eq('user_id', userId),
      {
        ...errorConfig.activity,
        analyticsProperties: { userId, days },
      },
    );

    // Initialize exactly `days` dates including today
    const activityMap = new Map<string, boolean>();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = toUTCDateString(date);
      if (dateStr) {
        activityMap.set(dateStr, false);
      }
    }

    // Mark dates with study session activity (any word review = session that day)
    (data || []).forEach(record => {
      const lastReview = record?.fsrs_last_review;
      if (lastReview) {
        const date = new Date(lastReview);
        const dateKey = toUTCDateString(date);

        // Only count activity within our specified date range
        if (date >= startDate && date <= endDate) {
          if (dateKey && activityMap.has(dateKey)) {
            activityMap.set(dateKey, true);
          }
        }
      }
    });

    return Array.from(activityMap.entries())
      .map(([date, hasActivity]) => ({ date, hasActivity }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get study session streak info
   * Reuses existing calculateStreak logic from ReadingStreakService
   */
  static async getStudySessionStreak(userId: string): Promise<ReadingStreak> {
    try {
      const activities = await this.getDailyStudySessionActivity(userId, 30);
      return ReadingStreakService.calculateStreak(activities);
    } catch {
      // If query fails (e.g., no study_words yet), return empty streak
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadingDate: null,
        totalReadingDays: 0,
      };
    }
  }

  /**
   * Get complete study session streak history data for visualization
   * Reuses existing calculation logic from ReadingStreakService
   */
  static async getStudySessionHistory(
    userId: string,
    days: number = 30,
  ): Promise<StreakHistoryData> {
    try {
      const dailyActivity = await this.getDailyStudySessionActivity(userId, days);
      const streakPeriods = ReadingStreakService.calculateStreakPeriods(dailyActivity);
      const streak = ReadingStreakService.calculateStreak(dailyActivity);

      return {
        dailyActivity,
        streakPeriods,
        metrics: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          totalReadingDays: streak.totalReadingDays,
        },
      };
    } catch {
      // If query fails, return empty history
      const emptyActivity: DailyReadingActivity[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        emptyActivity.push({
          date: toUTCDateString(date),
          hasActivity: false,
        });
      }
      return {
        dailyActivity: emptyActivity,
        streakPeriods: [],
        metrics: {
          currentStreak: 0,
          longestStreak: 0,
          totalReadingDays: 0,
        },
      };
    }
  }
}

// Export type aliases for study streaks (same structure as reading streaks)
export type StudyStreak = ReadingStreak;
export type DailyStudyActivity = DailyReadingActivity;

export const studySessionStreakService = StudySessionStreakService;
