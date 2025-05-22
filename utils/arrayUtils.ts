/**
 * Utility functions for array manipulation
 */

/**
 * Shuffles an array in place using the Fisher–Yates algorithm.
 *
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  if (!array.length) return [];
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // TypeScript doesn't track that j < i+1, but we know this is safe
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] as [T, T];
  }

  return shuffled;
}
