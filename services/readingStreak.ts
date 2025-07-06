import { supabase } from './supabase';

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadingDate: Date | null;
  streakStartDate: Date | null;
  totalReadingDays: number;
}

export interface DailyReadingActivity {
  date: string; // YYYY-MM-DD format
  articlesRead: number;
  sentencesRead: number;
  hasActivity: boolean;
}

// Interface matching the reading_progress table
interface ReadingProgressRecord {
  user_id: string;
  article_id: number;
  last_sentence_read: number;
  total_sentences: number;
  progress_percentage: number | null;
  updated_at: string;
  created_at: string | null;
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
      .from('reading_progress' as any)
      .select('article_id, last_sentence_read, total_sentences, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get reading activity: ${error.message}`);
    }

    // Group by date and calculate activity
    const activityMap = new Map<string, DailyReadingActivity>();

    // Initialize all dates with zero activity
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      if (dateStr) {
        activityMap.set(dateStr, {
          date: dateStr,
          articlesRead: 0,
          sentencesRead: 0,
          hasActivity: false,
        });
      }
    }

    // Process reading progress data
    const processedArticles = new Set<string>();

    ((data as unknown as ReadingProgressRecord[]) || []).forEach(record => {
      if (record.updated_at) {
        const date = new Date(record.updated_at).toISOString().split('T')[0];
        const articleDateKey = `${record.article_id}-${date}`;

        // Only count each article once per day (avoid double counting updates)
        if (date && !processedArticles.has(articleDateKey) && record.last_sentence_read > 0) {
          processedArticles.add(articleDateKey);

          const activity = activityMap.get(date);
          if (activity) {
            activity.articlesRead += 1;
            activity.sentencesRead += record.last_sentence_read;
            activity.hasActivity = true;
          }
        }
      }
    });

    return Array.from(activityMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate reading streak from daily activity data
   */
  static calculateStreak(activities: DailyReadingActivity[]): ReadingStreak {
    const today = new Date().toISOString().split('T')[0];
    const activeDays = activities.filter(day => day.hasActivity);

    if (activeDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadingDate: null,
        streakStartDate: null,
        totalReadingDays: 0,
      };
    }

    // Sort by date descending to find current streak
    const sortedActiveDays = activeDays.sort((a, b) => b.date.localeCompare(a.date));
    const lastReadingDate = new Date(sortedActiveDays[0]?.date || '');

    // Calculate current streak (consecutive days from today or yesterday)
    let currentStreak = 0;
    let streakStartDate: Date | null = null;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if we have activity today or yesterday to maintain streak
    const mostRecentDate = sortedActiveDays[0]?.date;
    const hasRecentActivity =
      mostRecentDate && (mostRecentDate === today || mostRecentDate === yesterdayStr);

    if (hasRecentActivity) {
      // Count consecutive days backwards from most recent activity
      const activeDatesSet = new Set(sortedActiveDays.map(a => a.date));

      // Start from the most recent active date and count backwards
      let currentDate = new Date(mostRecentDate);

      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (dateStr && activeDatesSet.has(dateStr)) {
          currentStreak++;
          streakStartDate = new Date(dateStr);
          // Move to previous day
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort all activities by date for longest streak calculation
    const allActivities = activities.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < allActivities.length; i++) {
      const activity = allActivities[i];

      if (activity && activity.hasActivity) {
        // Check if this is consecutive with the previous day
        const prevActivity = allActivities[i - 1];
        if (i === 0 || !prevActivity?.hasActivity) {
          // Start of a new streak
          tempStreak = 1;
        } else {
          // Check if dates are consecutive
          const prevDate = new Date(prevActivity.date);
          const currentDate = new Date(activity.date);
          const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

          if (dayDiff === 1) {
            tempStreak++;
          } else {
            tempStreak = 1; // Reset streak if not consecutive
          }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastReadingDate: lastReadingDate.getTime() ? lastReadingDate : null,
      streakStartDate,
      totalReadingDays: activeDays.length,
    };
  }

  /**
   * Get complete reading streak data for a user
   */
  static async getReadingStreak(userId: string): Promise<ReadingStreak> {
    const activities = await this.getDailyReadingActivity(userId, 365); // Check last year
    return this.calculateStreak(activities);
  }
}

export const readingStreakService = ReadingStreakService;
