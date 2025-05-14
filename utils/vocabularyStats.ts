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

  // Only count words that have been properly learned (state 3 is "Review" which means learned)
  // or have sufficient stability (>=30 days typically means properly learned)
  const wordsLearnedBefore = studyWords.filter(word => {
    // Skip words that don't have last review data
    const lastReview = word?.fsrs_last_review;
    if (!lastReview) return false;

    // Check if word was learned before our 7-day window
    const reviewDate = new Date(lastReview);
    if (reviewDate >= sevenDaysAgo) return false;

    // Only count words that are actually learned
    return (
      (word.fsrs_state === 3 && (word.fsrs_stability ?? 0) >= 1) ||
      (word.fsrs_reps > 0 && word.success_streak && word.success_streak > 0)
    );
  }).length;

  // Track words learned within the 7-day period
  const trackedRootIds = new Set<number>();

  // Group reviews by date and count unique roots learned each day
  studyWords.forEach(word => {
    const lastReview = word?.fsrs_last_review;
    if (!lastReview) return;

    const reviewDate = new Date(lastReview);
    reviewDate.setHours(0, 0, 0, 0);

    if (reviewDate >= sevenDaysAgo && reviewDate <= today) {
      // Only count a word as "learned" if it meets criteria
      const isLearned =
        (word.fsrs_state === 3 && (word.fsrs_stability ?? 0) >= 1) ||
        (word.fsrs_reps > 0 && word.success_streak && word.success_streak > 0);

      if (isLearned && word.root_id && !trackedRootIds.has(word.root_id)) {
        const dateString = reviewDate.toISOString().slice(0, 10);
        const dateData = dateMap.get(dateString);
        if (dateData) {
          dateData.count++;
          dateData.words.add(word.root_id);
          trackedRootIds.add(word.root_id);
        }
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
