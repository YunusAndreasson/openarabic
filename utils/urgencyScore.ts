/**
 * Utility functions for displaying vocabulary word memory strength
 * Used for progress bars and visual indicators in the dictionary
 */

/**
 * Get progress bar color based on stability level
 * Uses semantic colors to show learning progression
 *
 * @param stability - FSRS stability value (0-10+)
 * @returns Color name from theme ('error', 'warning', or 'success')
 */
export function getStabilityProgressColor(
  stability: number | null | undefined,
): 'error' | 'warning' | 'success' {
  const safeStability = stability ?? 0;

  // Red zone: 0-3 (early learning, weak memory)
  if (safeStability < 3) {
    return 'error';
  }

  // Yellow zone: 3-7 (consolidating, approaching mastery)
  if (safeStability < 7) {
    return 'warning';
  }

  // Green zone: 7-10+ (mastered, strong memory)
  return 'success';
}
