/**
 * Utility functions for displaying vocabulary word memory strength and
 * difficulty. Used for progress bars and visual indicators in the dictionary.
 */

import { UNSTABLE_DIFFICULTY_THRESHOLD } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';

/** Above this, FSRS difficulty reads as "moderate" rather than "easy" */
const MODERATE_DIFFICULTY_THRESHOLD = 5;

export type WordSignalColor = 'error' | 'warning' | 'success';

/**
 * Get progress bar color based on stability level
 * Uses semantic colors to show learning progression
 *
 * @param stability - FSRS stability value (0-10+)
 * @returns Color name from theme ('error', 'warning', or 'success')
 */
export function getStabilityProgressColor(stability: number | null | undefined): WordSignalColor {
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

/**
 * How hard FSRS thinks a word intrinsically is. `null` means the word has never
 * been reviewed, so there is no difficulty signal yet — distinct from "easy".
 *
 * Single source of truth for both the dictionary row's dot and the word detail
 * screen's Difficulty stat, so the two can never disagree.
 *
 * @param difficulty - FSRS difficulty value (1-10)
 */
export function getDifficultyLevel(
  difficulty: number | null | undefined,
): 'new' | 'easy' | 'moderate' | 'hard' {
  if (difficulty == null) return 'new';
  if (difficulty >= UNSTABLE_DIFFICULTY_THRESHOLD) return 'hard';
  if (difficulty >= MODERATE_DIFFICULTY_THRESHOLD) return 'moderate';
  return 'easy';
}

export const DIFFICULTY_LABELS = {
  new: STRINGS.WORD_STATE_NEW,
  easy: STRINGS.WORD_DIFFICULTY_EASY,
  moderate: STRINGS.WORD_DIFFICULTY_MODERATE,
  hard: STRINGS.WORD_DIFFICULTY_HARD,
} as const;

/**
 * Theme color key for a difficulty level. Red reads as "needs your attention",
 * matching the strength scale's polarity, so one glance means the same thing
 * whichever signal a surface shows. `new` gets a neutral dot rather than no dot
 * so the leading indicator column stays aligned.
 */
export const DIFFICULTY_COLORS = {
  new: 'textTertiary',
  easy: 'success',
  moderate: 'warning',
  hard: 'error',
} as const satisfies Record<ReturnType<typeof getDifficultyLevel>, string>;
