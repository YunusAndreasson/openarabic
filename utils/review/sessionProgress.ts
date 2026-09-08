/**
 * Percentage of the session's full due list that has finished drilling.
 * Working-set chunks only control loading; they do not define completion.
 * Pending retries do not count, and rounding must never fill an unfinished bar.
 */
export function getSessionProgress(finishedWords: number, totalWords: number): number {
  if (totalWords <= 0) return 0;
  if (finishedWords >= totalWords) return 100;
  return Math.min(99, Math.max(0, Math.round((finishedWords / totalWords) * 100)));
}
