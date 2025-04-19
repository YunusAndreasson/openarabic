import type { StudyWord } from '../types/vocabulary.types';

// Move to constants if this is used elsewhere in the codebase
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type DayName = (typeof DAY_NAMES)[number];

export interface WeeklyProgressData {
  date: string;
  count: number;
  wordsLearned: number;
}

interface ReviewLog {
  reviewed_at: string;
  grade: number;
  root_id: number;
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

  const dateMap = new Map<string, { date: DayName; count: number; words: Set<number> }>();

  // Initialize the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    // Get YYYY-MM-DD part of the ISO string
    const dateString = date.toISOString().slice(0, 10);
    dateMap.set(dateString, {
      date: DAY_NAMES[date.getDay()] as DayName,
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
    const lastReview = word?.fsrs_last_review;
    if (!lastReview) return false;
    const reviewDate = new Date(lastReview);
    return reviewDate < sevenDaysAgo;
  }).length;

  // Process review logs to track daily progress
  reviewLogs.forEach(log => {
    const reviewDate = new Date(log.reviewed_at);
    reviewDate.setHours(0, 0, 0, 0);

    if (reviewDate >= sevenDaysAgo && reviewDate <= today) {
      const dateString = reviewDate.toISOString().slice(0, 10);
      const dateData = dateMap.get(dateString);
      if (dateData) {
        dateData.count++;
        dateData.words.add(log.root_id);
      }
    }
  });

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
