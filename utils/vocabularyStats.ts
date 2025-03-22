import {
  StudyWord,
  SrsStats,
  VocabularyStats,
  WeeklyProgressData,
} from '../types/vocabulary.types';
import { State } from 'ts-fsrs'; // Import State enum from ts-fsrs

// Define our own WeeklyProgressData interface for internal use
interface FSRSWeeklyProgressData {
  date: Date;
  count: number;
  wordsLearned?: number; // Made optional to work with both old and new implementations
}

// We no longer need our own enum, we're using ts-fsrs State enum directly

/**
 * Calculate vocabulary statistics based on FSRS data
 * This directly uses the FSRS metrics to calculate statistics
 */
export function calculateVocabularyStats(studyWords: any[], dueWords: any[] = []): VocabularyStats {
  // If no words, return defaults
  if (!studyWords || studyWords.length === 0) {
    return {
      totalWords: 0,
      masteredWords: 0,
      learningWords: 0,
      dueWords: dueWords.length,
      streak: 0,
      successRate: 0,
      averageInterval: 0,
      averageEaseFactor: 0,
      averageLapses: 0,
      newWordsCount: 0,
      failedInSessionCount: 0,
      longestSuccessStreak: 0,
      wordsWithStreaks: 0,
      averageDifficulty: 0.3, // Default initial difficulty
    };
  }

  // Initialize counters
  let totalWords = studyWords.length;
  let masteredWords = 0;
  let learningWords = 0;
  let newWordsCount = 0;
  let totalStability = 0;
  let totalDifficulty = 0;
  let totalLapses = 0;
  let totalSuccessStreak = 0;
  let wordsWithStreaks = 0;
  let longestSuccessStreak = 0;

  // Process each word using FSRS state
  studyWords.forEach(word => {
    // Use ts-fsrs State enum directly for proper categorization
    switch (word.fsrs_state) {
      case State.New:
        newWordsCount++;
        learningWords++;
        break;

      case State.Learning:
        learningWords++;
        break;

      case State.Review:
        // Consider "Mastered" if stability is high (30+ days)
        if (word.fsrs_stability >= 30) {
          masteredWords++;
        } else {
          learningWords++;
        }
        break;

      case State.Relearning:
        learningWords++;
        break;

      default:
        // Default to learning for unknown states
        learningWords++;
    }

    // Add to totals using FSRS metrics
    if (word.fsrs_stability) totalStability += word.fsrs_stability;
    if (word.fsrs_difficulty) totalDifficulty += word.fsrs_difficulty;
    if (word.fsrs_lapses) totalLapses += word.fsrs_lapses;

    // Track streaks
    if (word.success_streak && word.success_streak > 0) {
      totalSuccessStreak += word.success_streak;
      wordsWithStreaks++;
      if (word.success_streak > longestSuccessStreak) {
        longestSuccessStreak = word.success_streak;
      }
    }
  });

  // Calculate averages using FSRS metrics
  const averageInterval = totalWords > 0 ? totalStability / totalWords : 0;
  const averageDifficulty = totalWords > 0 ? totalDifficulty / totalWords : 0.3;
  const averageLapses = totalWords > 0 ? totalLapses / totalWords : 0;

  // Calculate success rate based on FSRS difficulty (inverse relationship)
  // FSRS difficulty is 0-1, where lower means easier
  // Convert to success rate (0-100)
  const successRate = totalWords > 0 ? Math.max(0, 100 - averageDifficulty * 100) : 0;

  return {
    totalWords,
    masteredWords,
    learningWords,
    dueWords: dueWords.length,
    streak: 0, // Not used with FSRS
    successRate,
    averageInterval,
    averageEaseFactor: 0, // Not used with FSRS
    averageLapses,
    newWordsCount,
    failedInSessionCount: 0, // Not tracked in this version
    longestSuccessStreak,
    wordsWithStreaks,
    averageDifficulty,
  };
}

/**
 * Calculate weekly progress data based on FSRS review history
 */
export function calculateWeeklyProgressData(studyWords: any[]): WeeklyProgressData[] {
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

  // Format today's date as YYYY-MM-DD for comparison
  const todayFormatted = today.toISOString().split('T')[0];

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
      word.last_review,
      word.fsrs_due,
      word.next_review_at,
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

  console.log(`Detected ${reviewsDetected} reviews in the last 7 days`);

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
