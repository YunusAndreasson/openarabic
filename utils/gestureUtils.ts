import { LAYOUT } from '@/constants/layout';

// ===== GESTURE CONSTANTS =====
export const GESTURE_CONSTANTS = {
  SWIPE_THRESHOLD_RATIO: 0.04,
  RESET_DELAY: 50,
  MIN_DISTANCE: 0.1,
  MAX_TRANSLATION_RATIO: LAYOUT.OPACITY.HOVER,
  VELOCITY_THRESHOLD: 600, // Velocity threshold for swipe detection
} as const;

// ===== GESTURE CONFIGURATION =====
export const GESTURE_CONFIG = {
  MIN_DISTANCE: GESTURE_CONSTANTS.MIN_DISTANCE,
  ACTIVE_OFFSET_X: [-1, 1] as [number, number],
  // v2 Performance optimizations
  SIMULTANEOUS_GESTURES: true,
  SHOULD_CANCEL_WHEN_OUTSIDE: true,
} as const;
