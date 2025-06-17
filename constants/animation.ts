import { Easing } from 'react-native-reanimated';

/**
 * Timing configuration presets for animations
 */
export const TIMING_CONFIG = {
  FAST: {
    duration: 150,
    easing: Easing.out(Easing.quad),
  },
  MEDIUM: {
    duration: 250,
    easing: Easing.out(Easing.cubic),
  },
  SLOW: {
    duration: 350,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  GENTLE: {
    duration: 300,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
  },
} as const;

/**
 * Spring configuration presets for common animations
 */
export const SPRING_CONFIG = {
  BUTTON: {
    damping: 15,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  CARD: {
    damping: 15,
    stiffness: 120,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  TOGGLE: {
    damping: 15,
    stiffness: 120,
    mass: 0.5,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  SLIDE: {
    damping: 20,
    stiffness: 100,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
} as const;

/** Minimum duration for opacity animations */
export const MIN_OPACITY_DURATION = 1;

/** Slight delay used when mounting components to avoid flashes */
export const MIN_MOUNT_DELAY = 5;

/** Default scale amounts used for press animations */
export const PRESS_SCALE = {
  BUTTON: 0.97,
  CARD: 0.985,
} as const;

/** Default opacity reduction for card press animations */
export const CARD_PRESS_OPACITY = 0.97;

/** Scale value for toggle press feedback */
export const TOGGLE_PRESS_SCALE = 0.95;

/** Scale value used when pressing individual Arabic words */
export const WORD_PRESS_SCALE = 0.95;

/** Threshold for skipping progress animations if change is tiny */
export const PROGRESS_SKIP_THRESHOLD = 50;

/** Maximum progress value representing 100% */
export const PROGRESS_MAX_VALUE = 10000;

/** Default animation duration for UI feedback */
export const DEFAULT_ANIMATION_DURATION = 200;

/** Extra quick animation duration */
export const QUICK_ANIMATION_DURATION = 100;

/** Duration for rotation based animations */
export const ROTATION_ANIMATION_DURATION = 400;

/** Starting offset for toast translate animations */
export const TOAST_INITIAL_TRANSLATE_Y = 50;

/** Spring config for toast translate animations */
export const TOAST_SPRING = {
  damping: 15,
  stiffness: 200,
} as const;

/** Threshold to hide the header when scrolling */
export const HEADER_SCROLL_THRESHOLD = 50;

/** Scale value used when dismissing the Now Playing card */
export const NOW_PLAYING_DISMISS_SCALE = 0.92;

/** Shared height for the Now Playing card component */
export const NOW_PLAYING_CARD_HEIGHT = 120;

/** Initial scale for the Now Playing card when hidden */
export const NOW_PLAYING_START_SCALE = 0.95;

/** Spring configs for Now Playing card animations */
export const NOW_PLAYING_CARD_SPRING = {
  damping: 20,
  stiffness: 90,
  mass: 1,
} as const;

export const NOW_PLAYING_ENTRANCE_SCALE = {
  damping: 25,
  stiffness: 120,
} as const;

export const NOW_PLAYING_EXIT_SPRING = {
  damping: 25,
  stiffness: 150,
  mass: 0.8,
} as const;
