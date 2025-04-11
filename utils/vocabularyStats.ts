import type { StudyWord } from '../types/vocabulary.types';

export interface WeeklyProgressData {
  date: string;
  count: number;
  wordsLearned: number;
}

interface ReviewLog {
  reviewed_at: string;
  grade: number;
  sentence_word_id: number;
}

/**
 * Calculate weekly progress data from study words and review logs
 * @param studyWords Array of study words
 * @param reviewLogs Array of review logs
 * @returns Array of weekly progress data points
 */
export function calculateWeeklyProgressData(
  studyWords: StudyWord[] = [],
  reviewLogs: ReviewLog[] = []
): WeeklyProgressData[] {
  // Get today's date and create a map of dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create a map of dates and their corresponding day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateMap = new Map<string, { date: string; count: number; words: Set<number> }>();

  // Initialize the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    // Get YYYY-MM-DD part of the ISO string
    const dateString = date.toISOString().slice(0, 10);
    dateMap.set(dateString, {
      date: dayNames[date.getDay()],
      count: 0,
      words: new Set(),
    });
  }

  // Get the date 7 days ago for filtering
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // First, get the count of words learned before the 7-day period
  const wordsLearnedBefore = studyWords.filter(word => {
    if (!word?.fsrs_last_review) return false;
    const reviewDate = new Date(word.fsrs_last_review);
    return reviewDate < sevenDaysAgo;
  }).length;

  // Process review logs to track daily progress
  if (reviewLogs?.length > 0) {
    reviewLogs.forEach(log => {
      const reviewDate = new Date(log.reviewed_at);
      reviewDate.setHours(0, 0, 0, 0);

      if (reviewDate >= sevenDaysAgo && reviewDate <= today) {
        const dateString = reviewDate.toISOString().slice(0, 10);
        const dateData = dateMap.get(dateString);
        if (dateData) {
          dateData.count++;
          dateData.words.add(log.sentence_word_id);
        }
      }
    });
  }

  // Convert to array and calculate cumulative words learned
  let cumulativeWords = wordsLearnedBefore;

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, data]) => {
      // Add new unique words learned on this day to the cumulative count
      cumulativeWords += data.words.size;

      return {
        date: data.date,
        count: data.count,
        wordsLearned: Math.max(0, cumulativeWords),
      };
    });
}

export class VocabularyStats {
  studyWords: StudyWord[] = [];
  // ... existing code ...
}
