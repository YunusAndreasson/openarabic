import type { StudyWord, WeeklyProgressData } from '../types/vocabulary.types';

// Move to constants if this is used elsewhere in the codebase
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type DayName = (typeof DAY_NAMES)[number];

/**
 * Calculate weekly progress data from study words
 * @param studyWords Array of study words
 * @returns Array of weekly progress data points
 */
export function calculateWeeklyProgressData(studyWords: StudyWord[] = []): WeeklyProgressData[] {
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

  // Track words learned within the 7-day period and count those learned before
  let wordsLearnedBefore = 0;
  const trackedRootIds = new Set<number>();

  // Process study words in a single loop
  for (const word of studyWords) {
    const lastReview = word?.fsrs_last_review;
    if (!lastReview) continue;

    const reviewDate = new Date(lastReview);
    reviewDate.setHours(0, 0, 0, 0);

    const isLearned =
      (word.fsrs_state === 2 && (word.fsrs_stability ?? 0) >= 5) ||
      ((word.fsrs_reps ?? 0) > 0 && word.success_streak && word.success_streak > 0);

    if (!isLearned) continue;

    if (reviewDate < sevenDaysAgo) {
      wordsLearnedBefore++;
      continue;
    }

    if (reviewDate <= today && word.root_id && !trackedRootIds.has(word.root_id)) {
      const dateString = reviewDate.toISOString().slice(0, 10);
      const dateData = dateMap.get(dateString);
      if (dateData) {
        dateData.count++;
        dateData.words.add(word.root_id);
        trackedRootIds.add(word.root_id);
      }
    }
  }

  // Convert to array and calculate cumulative words learned
  let cumulativeWords = wordsLearnedBefore;
  const result: WeeklyProgressData[] = [];

  for (const data of dateMap.values()) {
    // Add new unique words learned on this day to the cumulative count
    cumulativeWords += data.words.size;
    result.push({
      date: data.date,
      count: data.count,
      wordsLearned: Math.max(0, cumulativeWords),
    });
  }

  return result;
}
