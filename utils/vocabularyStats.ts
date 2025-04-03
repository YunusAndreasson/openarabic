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
export function calculateWeeklyProgressData(reviewLogs: ReviewLog[] = []): WeeklyProgressData[] {
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
    const dateString = date.toISOString().split('T')[0];
    dateMap.set(dateString, {
      date: dayNames[date.getDay()],
      count: 0,
      words: new Set(),
    });
  }

  // Process review logs
  if (reviewLogs?.length > 0) {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    reviewLogs.forEach(log => {
      const reviewDate = new Date(log.reviewed_at);
      reviewDate.setHours(0, 0, 0, 0);

      if (reviewDate >= sevenDaysAgo && reviewDate <= today) {
        const dateString = reviewDate.toISOString().split('T')[0];
        const dateData = dateMap.get(dateString);
        if (dateData) {
          dateData.count++;
          dateData.words.add(log.sentence_word_id);
        }
      }
    });
  }

  // Convert to array and calculate cumulative words learned
  let cumulativeWords = 0;
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, data]) => {
      cumulativeWords += data.words.size;
      return {
        date: data.date,
        count: data.count,
        wordsLearned: cumulativeWords,
      };
    });
}
