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
