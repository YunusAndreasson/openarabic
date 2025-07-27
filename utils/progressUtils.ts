import { REVIEW_MIN_PROGRESS_VALUE } from '@/constants/animation';

// ===== PROGRESS CONSTANTS =====
export const PROGRESS_CONSTANTS = {
  MIN_PROGRESS_VALUE: REVIEW_MIN_PROGRESS_VALUE,
} as const;

/**
 * Calculates the display progress by taking the maximum of current progress and max progress
 * This ensures the progress bar never goes backwards and always shows the highest achieved progress
 * @param progress - The current progress value
 * @param maxProgress - The maximum progress value to compare against
 * @returns The display progress value (never less than maxProgress)
 */
export const calculateDisplayProgress = (progress: number, maxProgress: number): number => {
  return Math.max(progress, maxProgress);
};

/**
 * Determines if an animation should be triggered based on the animation key
 * @param animationKey - The animation key value to check
 * @param minValue - The minimum value required to trigger animation (default: REVIEW_MIN_PROGRESS_VALUE)
 * @returns True if animation should be triggered, false otherwise
 */
export const shouldTriggerAnimation = (
  animationKey: number,
  minValue: number = PROGRESS_CONSTANTS.MIN_PROGRESS_VALUE
): boolean => {
  return animationKey > minValue;
};
