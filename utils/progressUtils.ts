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

/**
 * Calculates progress percentage based on current and total values
 * @param current - The current progress value
 * @param total - The total value to calculate percentage against
 * @returns Progress percentage as a number between 0 and 100
 */
export const calculateProgressPercentage = (current: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (current / total) * 100));
};

/**
 * Validates if progress values are within valid ranges
 * @param progress - The progress value to validate
 * @param maxProgress - The maximum progress value to validate
 * @returns True if both values are valid, false otherwise
 */
export const validateProgressValues = (progress: number, maxProgress: number): boolean => {
  return (
    typeof progress === 'number' &&
    typeof maxProgress === 'number' &&
    !isNaN(progress) &&
    !isNaN(maxProgress) &&
    progress >= 0 &&
    maxProgress >= 0
  );
};

/**
 * Ensures progress value is within valid bounds
 * @param progress - The progress value to clamp
 * @param min - The minimum allowed value (default: 0)
 * @param max - The maximum allowed value (default: 100)
 * @returns The clamped progress value
 */
export const clampProgress = (progress: number, min: number = 0, max: number = 100): number => {
  return Math.max(min, Math.min(max, progress));
};
