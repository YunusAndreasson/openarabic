import { StudyWord, WeeklyProgressData } from '../types/vocabulary.types';

// We no longer need our own enum, we're using ts-fsrs State enum directly

/**
 * Calculate vocabulary statistics based on FSRS data
 * This directly uses the FSRS metrics to calculate statistics
 */
export function calculateWeeklyProgressData(studyWords: StudyWord[]): WeeklyProgressData[] {
  // Day name abbreviations
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Return a complete empty week structure if no words are available
  if (!studyWords || studyWords.length === 0) {
    // Get current day and calculate start/end of week
    const endOfWeek = new Date(); // Today
    const startOfWeek = new Date();
    startOfWeek.setDate(endOfWeek.getDate() - 6); // 6 days before today

    // Generate a complete empty week
    const emptyWeek: WeeklyProgressData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = dayNames[date.getDay()];
      emptyWeek.push({
        date: dayName,
        count: 0,
        wordsLearned: 0,
      });
    }

    return emptyWeek;
  }

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

  // Create buckets for each day with proper day names
  const dayBuckets: { [key: string]: { date: string; count: number; wordsLearned: number } } = {};

  dates.forEach(date => {
    // Format date as YYYY-MM-DD for bucket key
    const dateString = date.toISOString().split('T')[0];
    const dayName = dayNames[date.getDay()];
    dayBuckets[dateString] = { date: dayName, count: 0, wordsLearned: 0 };
  });

  // Count reviews in the last week
  let reviewsDetected = 0;

  // Count ANY word review that happened in the last week, regardless of source
  studyWords.forEach(word => {
    // Check for any timestamp we can use
    const timestampsToCheck = [
      // Order matters - check the most reliable field first
      word.fsrs_last_review,
      // Fall back to other fields if needed
      word.next_review_at,
      word.fsrs_due,
    ];

    // Use the first valid timestamp we find
    let reviewDate = null;
    for (const timestamp of timestampsToCheck) {
      if (timestamp) {
        reviewDate = new Date(timestamp);
        // Set hours to noon to avoid timezone issues
        reviewDate.setHours(12, 0, 0, 0);
        break;
      }
    }

    if (!reviewDate) return;

    // Check if review date is within the last 7 days
    const reviewDateString = reviewDate.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (reviewDate >= sevenDaysAgo && reviewDate <= today) {
      // It's within our date range
      reviewsDetected++;

      // Check if we have a bucket for this date
      if (dayBuckets[reviewDateString]) {
        // Count every review
        dayBuckets[reviewDateString].count++;
        // Consider ANY review a learning event
        dayBuckets[reviewDateString].wordsLearned++;
      }
    }
  });

  // Convert buckets to array and sort by date
  const result = Object.entries(dayBuckets)
    .map(([dateString, data]) => ({
      ...data,
      _sortDate: new Date(dateString), // Use for sorting only
    }))
    .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime())
    .map(({ _sortDate, ...rest }) => rest); // Remove the sorting helper property

  return result;
}
