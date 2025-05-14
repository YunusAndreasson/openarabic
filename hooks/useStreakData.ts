import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

// Helper function for consistent date formatting
export const formatDate = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastSevenDaysActivity: {
    date: string;
    active: boolean;
    dayName: string;
  }[];
  streakStartDate: Date | null;
}

/**
 * Hook to calculate and manage user vocabulary review streak data
 *
 * @param userId The user ID to fetch review logs for
 * @returns Object containing streak information and activity history
 */
export function useStreakData(userId?: string | null): StreakData {
  // Fetch review logs
  const { data: reviewLogs = [] } = useQuery({
    queryKey: ['review-logs', userId],
    queryFn: () => (userId ? studyWordsFSRSService.getReviewLogs(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate streak data from review logs
  return useMemo(() => {
    // Default return value for empty data
    const defaultData: StreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastSevenDaysActivity: [],
      streakStartDate: null,
    };

    // Set up the today date consistently with UTC midnight
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Helper function to create the 7-day activity array
    const createSevenDayActivity = () => {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i)); // 6 days ago to today
        return {
          date: formatDate(date),
          active: false,
          dayName: dayNames[date.getDay()]!,
        };
      });
    };

    // Return empty data with proper structure if no logs
    if (!reviewLogs.length) {
      defaultData.lastSevenDaysActivity = createSevenDayActivity();
      return defaultData;
    }

    // Initialize seven day activity array
    const lastSevenDaysActivity = createSevenDayActivity();

    // Group review logs by day to identify active days
    const activeDays = new Map<string, boolean>();
    reviewLogs.forEach(log => {
      if (!log.reviewed_at) return;
      try {
        const reviewDate = new Date(log.reviewed_at);
        activeDays.set(formatDate(reviewDate), true);
      } catch (error) {
        // Skip invalid dates
      }
    });

    // Mark days as active in the seven-day view
    lastSevenDaysActivity.forEach(day => {
      day.active = activeDays.has(day.date);
    });

    // Calculate the current streak
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    // Is today or yesterday active?
    const isTodayActive = activeDays.has(todayStr);
    const isYesterdayActive = activeDays.has(yesterdayStr);

    // Calculate current streak
    let currentStreak = 0;
    let streakStartDate: Date | null = null;

    if (isTodayActive) {
      currentStreak = 1;
      streakStartDate = new Date(today);
    } else if (isYesterdayActive) {
      currentStreak = 1;
      streakStartDate = new Date(yesterday);
    }

    // Calculate streaks by walking backward through dates
    if (currentStreak > 0 && streakStartDate) {
      let checkDate = new Date(streakStartDate);
      let keepChecking = true;

      while (keepChecking) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (activeDays.has(formatDate(checkDate))) {
          currentStreak++;
        } else {
          keepChecking = false;
        }
      }
    }

    // Find longest streak in the entire history
    let longestStreak = 0;
    if (activeDays.size > 0) {
      // Helper function to check if two dates are consecutive
      function areDatesConsecutive(date1: Date, date2: Date): boolean {
        // Ensure both dates are valid
        if (!date1 || !date2) return false;

        const d1 = new Date(`${formatDate(date1)}T00:00:00.000Z`);
        const d2 = new Date(`${formatDate(date2)}T00:00:00.000Z`);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return diffTime === 86400000; // Exactly 24 hours (1 day) in milliseconds
      }

      // Sort dates in ascending order
      const sortedDates = Array.from(activeDays.keys())
        .map(dateStr => new Date(`${dateStr}T00:00:00.000Z`))
        .sort((a, b) => a.getTime() - b.getTime());

      let tempStreak = 1;

      // Calculate longest streak
      for (let i = 1; i < sortedDates.length; i++) {
        if (areDatesConsecutive(sortedDates[i - 1] as Date, sortedDates[i] as Date)) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }

      // Check final streak
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    // Update longest streak if current streak is longer
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    return {
      currentStreak,
      longestStreak,
      lastSevenDaysActivity,
      streakStartDate,
    };
  }, [reviewLogs]);
}
