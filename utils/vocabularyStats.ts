import { StudyWord } from '@/types/vocabulary.types';

interface WeeklyProgress {
  date: string;
  count: number;
  wordsLearned: number;
}

export interface WeeklyProgressData {
  date: string;
  count: number;
  wordsLearned: number;
}

/**
 * Calculate weekly progress data from study words
 * @param studyWords Array of study words
 * @returns Array of weekly progress data points
 */
export function calculateWeeklyProgressData(studyWords: StudyWord[]): WeeklyProgressData[] {
  // Get today's date with time set to noon to avoid timezone issues
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Create an array of dates representing the last 7 days (including today)
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }

  // Day name abbreviations
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Create buckets for each day with proper day names
  const dayBuckets: { [key: string]: WeeklyProgress } = {};

  dates.forEach(date => {
    // Format date as YYYY-MM-DD for bucket key
    const dateString = date.toISOString().split('T')[0];
    const dayName = dayNames[date.getDay()];
    dayBuckets[dateString] = { date: dayName, count: 0, wordsLearned: 0 };
  });

  // Process each study word
  studyWords.forEach(word => {
    // Skip invalid words
    if (!word.fsrs_last_review) return;

    const reviewDate = new Date(word.fsrs_last_review);
    reviewDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

    // Check if review date is within the last 7 days
    const reviewDateString = reviewDate.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (reviewDate >= sevenDaysAgo && reviewDate <= today) {
      // Check if we have a bucket for this date
      if (dayBuckets[reviewDateString]) {
        // Count every review
        dayBuckets[reviewDateString].count++;
        // Consider ANY review a learning event
        dayBuckets[reviewDateString].wordsLearned++;
      }
    }
  });

  // Convert to array and sort by date
  return Object.values(dayBuckets).sort((a, b) => {
    const dayOrder = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return dayOrder[a.date as keyof typeof dayOrder] - dayOrder[b.date as keyof typeof dayOrder];
  });
}
