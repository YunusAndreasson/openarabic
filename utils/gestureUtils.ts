import { LAYOUT } from '@/constants/layout';

// ===== GESTURE CONSTANTS =====
export const GESTURE_CONSTANTS = {
  SWIPE_THRESHOLD_RATIO: 0.04,
  RESET_DELAY: 50,
  MIN_DISTANCE: 0.1,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
  // v2 Performance optimizations
  DEBOUNCE_DELAY: 16, // 60fps
  HAPTIC_THRESHOLD: 0.02, // Minimum movement for haptic feedback
} as const;

// ===== GESTURE CONFIGURATION =====
export const GESTURE_CONFIG = {
  MIN_DISTANCE: GESTURE_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-1, 1] as [number, number],
  // v2 Performance optimizations
  SIMULTANEOUS_GESTURES: true,
  SHOULD_CANCEL_WHEN_OUTSIDE: true,
} as const;

// ===== GESTURE STATE TYPES =====
export type GestureState = 'idle' | 'active' | 'cancelled' | 'ended';
export type SwipeDirection = 'left' | 'right' | 'none';

// ===== GESTURE UTILITIES =====
export const GestureUtils = {
  /**
   * Calculate swipe direction based on translation
   */
  getSwipeDirection: (translationX: number, threshold: number): SwipeDirection => {
    if (Math.abs(translationX) < threshold) return 'none';
    return translationX > 0 ? 'right' : 'left';
  },

  /**
   * Check if gesture should be enabled based on state
   */
  shouldEnableGesture: (isUpdating: boolean, isTransitioning: boolean): boolean => {
    return !isUpdating && !isTransitioning;
  },

  /**
   * Clamp translation value within bounds
   */
  clampTranslation: (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  },
} as const;
