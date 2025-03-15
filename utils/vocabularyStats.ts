import {
  StudyWord,
  SrsStats,
  VocabularyStats,
  WeeklyProgressData,
} from '../types/vocabulary.types';

/**
 * Determine if a word is considered "mastered" based on its interval
 * @param word The study word to check
 * @returns boolean indicating if the word is mastered
 */
export function isMasteredWord(word: StudyWord): boolean {
  // A word is considered mastered if its interval is 30 days or more
  return word.interval_days >= 30;
}

/**
 * Estimate the last review date for a word based on its next review date and interval
 * @param word The study word to estimate for
 * @param currentTime The current time to use as reference
 * @returns The estimated last review date or null if the word has never been reviewed
 */
export function estimateLastReviewDate(word: StudyWord, currentTime: Date): Date | null {
  if (word.review_count === 0) return null;

  // The next review date is scheduled as last review date + interval days
  const reviewDate = new Date(word.next_review_at);

  // If the word has been reviewed, subtract interval days to get the approximate last review date
  reviewDate.setDate(reviewDate.getDate() - word.interval_days);

  // Ensure we don't return future dates for last review
  if (reviewDate > currentTime) return new Date(currentTime);

  return reviewDate;
}

/**
 * Calculate the current streak based on review history
 * @param words The list of study words to analyze
 * @returns The current streak (consecutive days with reviews)
 */
export function calculateStreak(words: StudyWord[]): number {
  if (words.length === 0) return 0;

  const now = new Date();
  // Calculate streak based on review history
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find last review dates
  const reviewDates = words
    .map(word => estimateLastReviewDate(word, now))
    .filter(Boolean) as Date[];

  if (reviewDates.length === 0) {
    return 0;
  }

  // Sort descending to get the most recent review first
  reviewDates.sort((a, b) => b.getTime() - a.getTime());

  const lastReviewDate = new Date(reviewDates[0]);
  lastReviewDate.setHours(0, 0, 0, 0);

  // Check if user has reviewed today
  const daysDifference = Math.floor(
    (today.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDifference > 1) {
    // Streak broken - more than 1 day since last review
    return 0;
  } else {
    // Count consecutive days with reviews
    let currentDate = new Date(today);
    let currentStreak = 0;
    const MAX_ITERATIONS = 366; // Safety limit (maximum 1 year of streak)
    let iterations = 0;

    // Group review dates by day
    const reviewDatesByDay = new Map();
    reviewDates.forEach(date => {
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      reviewDatesByDay.set(dateKey, true);
    });

    // Check for consecutive days backward in time
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

      if (reviewDatesByDay.has(dateKey)) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  }
}

/**
 * Calculate weekly progress data for the last 7 days
 */
export function calculateWeeklyProgressData(words: StudyWord[]): WeeklyProgressData[] {
  if (words.length === 0)
    return Array(7)
      .fill(0)
      .map((_, i) => ({
        date: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        wordsLearned: 0,
      }));

  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  // Create an array to hold the last 7 days with pre-initialized counts
  const dayMap = new Map();

  // Initialize the map with the last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    dayMap.set(dayKey, {
      date: days[date.getDay()],
      wordsLearned: 0,
    });
  }

  // Count words learned per day based on estimated review dates
  words.forEach(word => {
    const reviewDate = estimateLastReviewDate(word, now);
    if (reviewDate) {
      const dayKey = `${reviewDate.getFullYear()}-${reviewDate.getMonth()}-${reviewDate.getDate()}`;
      if (dayMap.has(dayKey)) {
        const dayData = dayMap.get(dayKey);
        dayData.wordsLearned += 1;
        dayMap.set(dayKey, dayData);
      }
    }
  });

  // Convert map back to array in the correct order
  return Array.from(dayMap.values());
}

/**
 * Calculate comprehensive vocabulary statistics
 * @param allWords All study words for the user
 * @param dueWords Words that are due for review
 * @returns Comprehensive vocabulary statistics
 */
export function calculateVocabularyStats(
  allWords: StudyWord[],
  dueWords: StudyWord[] = []
): VocabularyStats {
  if (!allWords.length) {
    return {
      totalWords: 0,
      dueWords: 0,
      masteredWords: 0,
      learningWords: 0,
      streak: 0,
      successRate: 0,
      averageInterval: 0,
      averageEaseFactor: 0,
      averageLapses: 0,
      newWordsCount: 0,
      failedInSessionCount: 0,
    };
  }

  // Basic stats
  const validStudyWords = allWords.filter(word => word.sentence_word != null);
  const masteredWords = validStudyWords.filter(isMasteredWord);
  const learningWords = validStudyWords.length - masteredWords.length;
  const streak = calculateStreak(validStudyWords);
  const dueWordsCount = dueWords.length;

  // Calculate detailed stats
  let totalInterval = 0;
  let totalEaseFactor = 0;
  let totalSuccesses = 0;
  let totalLapses = 0;

  validStudyWords.forEach(word => {
    totalInterval += word.interval_days;
    totalEaseFactor += word.ease_factor;
    totalSuccesses += word.review_count - word.lapses;
    totalLapses += word.lapses;
  });

  const totalWords = validStudyWords.length;
  const averageInterval = totalWords > 0 ? totalInterval / totalWords : 0;
  const averageEaseFactor = totalWords > 0 ? totalEaseFactor / totalWords : 0;
  const totalReviews = validStudyWords.reduce((sum, word) => sum + word.review_count, 0);
  const successRate = totalReviews > 0 ? (totalSuccesses / totalReviews) * 100 : 0;
  const averageLapses = totalWords > 0 ? totalLapses / totalWords : 0;

  // Count new words and failed in session
  const newWordsCount = validStudyWords.filter(w => w.sessionData?.isNew).length;
  const failedInSessionCount = validStudyWords.filter(w => w.sessionData?.failedInSession).length;

  return {
    totalWords,
    dueWords: dueWordsCount,
    masteredWords: masteredWords.length,
    learningWords,
    streak,
    successRate,
    averageInterval,
    averageEaseFactor,
    averageLapses,
    newWordsCount,
    failedInSessionCount,
  };
}
