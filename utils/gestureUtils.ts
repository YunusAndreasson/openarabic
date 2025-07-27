import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

// ===== GESTURE CONSTANTS =====
export const GESTURE_CONSTANTS = {
  SWIPE_THRESHOLD_RATIO: 0.04,
  RESET_DELAY: 50,
  MIN_DISTANCE: 0.1,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
} as const;

// ===== SCRUBBER CONSTANTS =====
export const SCRUBBER_CONSTANTS = {
  HANDLE_SIZE: 20,
  HANDLE_SIZE_ACTIVE: 28,
  TRACK_HEIGHT: 4,
  TRACK_HEIGHT_ACTIVE: 12,
  DEFAULT_TRACK_WIDTH: 300,
} as const;

// ===== GESTURE CONFIGURATION =====
export const GESTURE_CONFIG = {
  MIN_DISTANCE: GESTURE_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-1, 1] as [number, number],
} as const;

// ===== DYNAMIC CALCULATIONS =====
export const getSwipeThreshold = (): number => {
  return SCREEN_WIDTH * GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO;
};

export const getMaxTranslation = (): number => {
  return SCREEN_WIDTH * GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO;
};

/**
 * Calculates the swipe threshold based on screen width
 * @param screenWidth - The width of the screen
 * @param thresholdRatio - The ratio of screen width to use as threshold (default: 0.04)
 * @returns The swipe threshold in pixels
 */
export const calculateSwipeThreshold = (
  screenWidth: number,
  thresholdRatio: number = GESTURE_CONSTANTS.SWIPE_THRESHOLD_RATIO
): number => {
  return screenWidth * thresholdRatio;
};

/**
 * Calculates the maximum translation distance based on screen width
 * @param screenWidth - The width of the screen
 * @param translationRatio - The ratio of screen width to use as max translation (default: LAYOUT.OPACITY.HOVER)
 * @returns The maximum translation in pixels
 */
export const calculateMaxTranslation = (
  screenWidth: number,
  translationRatio: number = GESTURE_CONSTANTS.MAX_TRANSLATION_RATIO
): number => {
  return screenWidth * translationRatio;
};

/**
 * Clamps a translation value to the maximum allowed range
 * @param translationX - The current translation value
 * @param maxTranslation - The maximum allowed translation (default: calculated from screen width)
 * @returns The clamped translation value
 */
export const clampTranslation = (translationX: number, maxTranslation?: number): number => {
  const max = maxTranslation ?? getMaxTranslation();
  return Math.max(-max, Math.min(max, translationX));
};

/**
 * Determines if a swipe gesture meets the threshold for completion
 * @param translationX - The translation distance of the gesture
 * @param threshold - The threshold distance required (default: calculated from screen width)
 * @returns True if the gesture meets the threshold
 */
export const isSwipeThresholdMet = (translationX: number, threshold?: number): boolean => {
  const thresh = threshold ?? getSwipeThreshold();
  return Math.abs(translationX) > thresh;
};

/**
 * Determines the direction of a swipe gesture
 * @param translationX - The translation distance of the gesture
 * @returns 'left' for negative translation, 'right' for positive translation
 */
export const getSwipeDirection = (translationX: number): 'left' | 'right' => {
  return translationX > 0 ? 'right' : 'left';
};

/**
 * Determines if a swipe gesture should trigger an action based on threshold
 * @param translationX - The translation distance of the gesture
 * @param threshold - The threshold distance required (default: calculated from screen width)
 * @returns The swipe direction if threshold is met, null otherwise
 */
export const getSwipeAction = (
  translationX: number,
  threshold?: number
): 'left' | 'right' | null => {
  if (isSwipeThresholdMet(translationX, threshold)) {
    return getSwipeDirection(translationX);
  }
  return null;
};
