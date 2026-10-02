/**
 * Utility functions for calculating reading progress
 */

/**
 * Calculate progress percentage from sentence position
 *
 * @param lastSentenceRead - 0-based index of the last sentence read (0 = first sentence, -1 = no progress)
 * @param totalSentences - Total number of sentences in the article
 * @returns Progress percentage (0-100)
 *
 * @example
 * // Article with 100 sentences, user at last sentence (index 99)
 * calculateProgressPercentage(99, 100) // Returns 100
 *
 * @example
 * // Article with 10 sentences, user at first sentence (index 0)
 * calculateProgressPercentage(0, 10) // Returns 10
 *
 * @example
 * // Article with 10 sentences, no progress (index -1)
 * calculateProgressPercentage(-1, 10) // Returns 0
 */
export function calculateProgressPercentage(
  lastSentenceRead: number,
  totalSentences: number,
): number {
  if (totalSentences === 0) return 0;

  // Handle -1 as "no progress read" (used when resetting progress)
  if (lastSentenceRead < 0) return 0;

  // last_sentence_read is 0-based index, add 1 to get count of sentences read
  // Example: index 99 in 100 sentences = (99 + 1) / 100 = 100%
  return Math.round(((lastSentenceRead + 1) / totalSentences) * 100);
}

/** The two fields a percentage is computed from; every reading-progress row carries them. */
export interface SentenceProgress {
  last_sentence_read: number;
  total_sentences: number;
}

/** A bulk reading-progress lookup keyed by article id. */
export type ReadingProgressLookup = ReadonlyMap<number, SentenceProgress>;

/**
 * Progress percentage for one article out of a bulk progress lookup.
 * An article with no progress row — or a lookup that has not loaded — reads as 0.
 */
export function getArticleProgressPercentage(
  progressMap: ReadingProgressLookup | null | undefined,
  articleId: number,
): number {
  const progress = progressMap?.get(articleId);
  return progress
    ? calculateProgressPercentage(progress.last_sentence_read, progress.total_sentences)
    : 0;
}
