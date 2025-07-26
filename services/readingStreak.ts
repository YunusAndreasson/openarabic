import { supabase } from './supabase';

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
   * Get daily reading activity for a user over a specified period
   */
  static async getDailyReadingActivity(
    userId: string,
    days: number = 30
  ): Promise<DailyReadingActivity[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('reading_progress')
      .select('updated_at')
      .eq('user_id', userId)
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())
      .gt('last_sentence_read', 0);

    if (error) {
      throw new Error(`Failed to get reading activity: ${error.message}`);
    }

    // Group by date
    const activityMap = new Map<string, boolean>();

    // Initialize all dates with no activity
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr) {
        activityMap.set(dateStr, false);
      }
    }

    // Mark dates with activity
    (data || []).forEach(record => {
      if (record && typeof record === 'object' && 'updated_at' in record) {
        const typedRecord = record as { updated_at: string | null };
        if (typedRecord.updated_at) {
          const date = new Date(typedRecord.updated_at).toISOString().split('T')[0];
          if (date) {
            activityMap.set(date, true);
          }
        }
      }
    });

    return Array.from(activityMap.entries())
      .map(([date, hasActivity]) => ({ date, hasActivity }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate reading streak from daily activity data
   */
  static calculateStreak(activities: DailyReadingActivity[]): ReadingStreak {
    // Use UTC dates for consistent timezone handling
    const today = new Date();
    const todayStr = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    )
      .toISOString()
      .split('T')[0];

    const activeDays = activities.filter(day => day.hasActivity);

    if (activeDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadingDate: null,
        totalReadingDays: 0,
      };
    }

    const sortedActiveDays = activeDays.sort((a, b) => b.date.localeCompare(a.date));
    const lastReadingDate = new Date(sortedActiveDays[0]?.date || '');

    // Calculate current streak
    let currentStreak = 0;
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = new Date(
      Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())
    )
      .toISOString()
      .split('T')[0];

    const mostRecentDate = sortedActiveDays[0]?.date;
    const hasRecentActivity =
      mostRecentDate && (mostRecentDate === todayStr || mostRecentDate === yesterdayStr);

    if (hasRecentActivity) {
      const activeDatesSet = new Set(sortedActiveDays.map(a => a.date));
      let currentDate = new Date(mostRecentDate);

      while (true) {
        const dateStr = new Date(
          Date.UTC(
            currentDate.getUTCFullYear(),
            currentDate.getUTCMonth(),
            currentDate.getUTCDate()
          )
        )
          .toISOString()
          .split('T')[0];
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
      if (activity && activity.hasActivity) {
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
            isActive: false, // Will be set later
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
      // Use UTC dates for consistent timezone handling
      const today = new Date();
      const todayStr = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      )
        .toISOString()
        .split('T')[0];

      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = new Date(
        Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate())
      )
        .toISOString()
        .split('T')[0];

      if (lastPeriod && (lastPeriod.endDate === todayStr || lastPeriod.endDate === yesterdayStr)) {
        lastPeriod.isActive = true;
      }
    }

    return periods;
  }

  /**
   * Get complete streak history data
   */
  static async getStreakHistory(userId: string, days: number = 30): Promise<StreakHistoryData> {
    const dailyActivity = await this.getDailyReadingActivity(userId, days);
    const streakPeriods = this.calculateStreakPeriods(dailyActivity);
    const streak = this.calculateStreak(dailyActivity);

    return {
      dailyActivity,
      streakPeriods,
      metrics: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalReadingDays: streak.totalReadingDays,
      },
    };
  }

  /**
   * Get basic reading streak info
   */
  static async getReadingStreak(userId: string): Promise<ReadingStreak> {
    const activities = await this.getDailyReadingActivity(userId, 30);
    return this.calculateStreak(activities);
  }
}

export const readingStreakService = ReadingStreakService;
