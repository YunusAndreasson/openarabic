import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

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

    if (!reviewLogs.length) {
      // Return empty activity array with appropriate structure
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      defaultData.lastSevenDaysActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i)); // 6 days ago to today
        return {
          date: date.toISOString().slice(0, 10),
          active: false,
          dayName: dayNames[date.getDay()]!,
        };
      });

      return defaultData;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize last seven days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const lastSevenDaysActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i)); // 6 days ago to today
      return {
        date: date.toISOString().slice(0, 10),
        active: false,
        dayName: dayNames[date.getDay()]!,
      };
    });

    // Group review logs by day to identify active days
    const activeDays = new Map<string, boolean>();
    reviewLogs.forEach(log => {
      if (!log.reviewed_at) return;

      // Extract date portion for grouping
      const dateString = new Date(log.reviewed_at).toISOString().slice(0, 10);
      activeDays.set(dateString, true);
    });

    // Mark days as active in the seven-day view
    lastSevenDaysActivity.forEach(day => {
      day.active = activeDays.has(day.date);
    });

    // Calculate the current streak
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    // Is today active?
    const isTodayActive = activeDays.has(todayStr);
    // Is yesterday active?
    const isYesterdayActive = activeDays.has(yesterdayStr);

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;
    let streakStartDate: Date | null = null;

    // Find the most recent active date
    const activeDatesArray = Array.from(activeDays.keys()).sort();

    if (activeDatesArray.length) {
      // Convert active days to numerical sequences for streak calculation
      let currentStreakDays: Date[] = [];

      // If today is active, start streak from today
      if (isTodayActive) {
        currentStreak = 1;
        streakStartDate = new Date(today);
        currentStreakDays.push(new Date(today));
      }
      // If yesterday is active but today is not, we keep the streak active
      else if (isYesterdayActive) {
        currentStreak = 1;
        streakStartDate = new Date(yesterday);
        currentStreakDays.push(new Date(yesterday));
      }

      // Calculate streaks by walking backward through dates
      if (currentStreak > 0 && streakStartDate) {
        let checkDate = new Date(streakStartDate);
        let keepChecking = true;

        while (keepChecking) {
          checkDate.setDate(checkDate.getDate() - 1);
          const checkDateStr = checkDate.toISOString().slice(0, 10);

          if (activeDays.has(checkDateStr)) {
            currentStreak++;
            currentStreakDays.push(new Date(checkDate));
          } else {
            keepChecking = false;
          }
        }
      }

      // Find longest streak in the entire history
      let tempStreak = 0;
      let tempStart: Date | null = null;
      let tempStreakDays: Date[] = [];
      let longestStreakDays: Date[] = [];

      // Sort dates in ascending order
      const sortedDates = activeDatesArray
        .map(date => new Date(date))
        .sort((a, b) => a.getTime() - b.getTime());

      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];

        // Start a new streak
        if (
          i === 0 ||
          (currentDate &&
            sortedDates[i - 1] &&
            currentDate.getTime() - sortedDates[i - 1]!.getTime() > 24 * 60 * 60 * 1000)
        ) {
          // If the previous streak ended, check if it was the longest
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
            longestStreakDays = [...tempStreakDays];
          }

          // Start new streak
          tempStreak = 1;
          tempStart = currentDate || null;
          tempStreakDays = [currentDate!];
        }
        // Continue current streak
        else if (i > 0 && currentDate && sortedDates[i - 1]) {
          // Check if dates are consecutive
          const prevDate = new Date(sortedDates[i - 1]!);
          prevDate.setDate(prevDate.getDate() + 1);

          if (prevDate.toISOString().slice(0, 10) === currentDate.toISOString().slice(0, 10)) {
            tempStreak++;
            tempStreakDays.push(currentDate);
          } else {
            // If the dates aren't consecutive, check if the streak was longest
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
              longestStreakDays = [...tempStreakDays];
            }

            // Start new streak
            tempStreak = 1;
            tempStart = currentDate || null;
            tempStreakDays = [currentDate!];
          }
        }
      }

      // Check the last streak
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
        longestStreakDays = [...tempStreakDays];
      }

      // Update current streak if it's the longest
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastSevenDaysActivity,
      streakStartDate,
    };
  }, [reviewLogs]);
}
