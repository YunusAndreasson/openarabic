import { Easing } from 'react-native-reanimated';

/**
 * Timing configuration presets for animations
 */
export const TIMING_CONFIG = {
  FAST: {
    duration: 120, // Faster for more responsive feel
    easing: Easing.out(Easing.cubic), // More natural easing
  },
  MEDIUM: {
    duration: 200, // Faster than before for snappier feel
    easing: Easing.out(Easing.cubic), // More natural easing
  },
  SLOW: {
    duration: 300, // Slightly faster for better responsiveness
    easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Material Design easing
  },
  GENTLE: {
    duration: 250, // Faster for more responsive gentle animations
    easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Natural gentle easing
  },
  ENTRANCE: {
    duration: 250, // Component entrance animations
    easing: Easing.out(Easing.cubic), // Natural entrance easing
  },
  PROGRESS: {
    duration: 400, // Progress bar animations
    easing: Easing.out(Easing.cubic), // Smooth progress easing
  },
} as const;

/**
 * Spring configuration presets for common animations
 */
export const SPRING_CONFIG = {
  BUTTON: {
    damping: 18, // Higher damping for smoother, less bouncy feel
    stiffness: 180, // Higher stiffness for more responsive feel
    mass: 0.9, // Slightly lighter for snappier response
    overshootClamping: false,
    energyThreshold: 0.01,
  },
  CARD: {
    damping: 20, // High damping - no bounce
    stiffness: 400, // Very high stiffness - instant response
    mass: 0.4, // Light mass - snappy
    overshootClamping: true, // No overshoot
    energyThreshold: 0.01,
  },
  TOGGLE: {
    damping: 18, // Higher damping for smoother feel
    stiffness: 140, // Higher stiffness for more responsive feel
    mass: 0.4, // Lighter mass for snappier toggle feel
    overshootClamping: false,
    energyThreshold: 0.01,
  },
  RESPONSIVE: {
    damping: 20, // Slightly higher damping for smoother feel
    stiffness: 250, // Reduced stiffness for less jitter
    mass: 0.6, // Lighter mass for quicker response
    overshootClamping: false,
    energyThreshold: 0.01,
  },
} as const;

/** Minimum duration for opacity animations */
export const MIN_OPACITY_DURATION = 1;

/** Slight delay used when mounting components to avoid flashes */
export const MIN_MOUNT_DELAY = 5;

/**
 * Unified press scale constants for all interactive elements.
 * Values closer to 1.0 = subtler feedback, values further from 1.0 = stronger feedback.
 */
export const PRESS_SCALE = {
  /** Default press feedback for buttons and cards (subtle) */
  DEFAULT: 0.96,
  /** Alias for DEFAULT - buttons use subtle feedback */
  BUTTON: 0.96,
  /** Alias for DEFAULT - cards use subtle feedback */
  CARD: 0.96,
  /** Moderate press for toggles and interactive words */
  MODERATE: 0.95,
  /** Strong press for icon buttons */
  STRONG: 0.9,
  /** Scale up for drag feedback */
  DRAG_UP: 1.05,
} as const;

/** Default opacity reduction for card press animations */
export const CARD_PRESS_OPACITY = 0.97;

/**
 * Multiplier for FlashList draw distance (overscroll rendering).
 * Value of 3 = render items up to 3x viewport height above/below visible area.
 * Higher values = smoother scrolling but more memory usage.
 * 3 is a balanced default for most list sizes.
 */
export const LIST_DRAW_DISTANCE_MULTIPLIER = 3;

/**
 * Scroll event throttle in milliseconds.
 * 8ms = 120fps (matches ProMotion displays on iPhone 13+).
 * Use 16ms (60fps) if performance is a concern on older devices.
 */
export const SCROLL_EVENT_THROTTLE = 8;

/**
 * Default toast notification visibility duration in milliseconds.
 * 4 seconds provides adequate reading time for most messages.
 */
export const DEFAULT_TOAST_DURATION = 4000;

/**
 * General timing constants for delays, timeouts, and intervals
 */
export const TIMING_CONSTANTS = {
  /** Delay before navigation to allow press animation to complete */
  NAVIGATION_DELAY: 60, // TIMING_CONFIG.FAST.duration / 2

  /** Quick delays for UI feedback */
  QUICK_DELAY: 100,

  /** Standard medium delay */
  MEDIUM_DELAY: 300,

  /** One second in milliseconds */
  SECOND: 1000,

  /** Two and a half seconds */
  BUFFER_FLUSH: 2500,

  /** Five seconds */
  LONG_DELAY: 5000,

  /** Ten seconds */
  VERY_LONG_DELAY: 10000,

  /** Conversion multipliers */
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,

  /** Common animation delays */
  MOUNT_DELAY: 100,
  DEBOUNCE_DELAY: 300,
  FOCUS_DELAY: 100,

  /** Audio-related delays */
  AUDIO_FADE_DURATION: 300,
  AUDIO_BUFFER_DELAY: 100,

  /** Network request timeouts */
  NETWORK_TIMEOUT: 10000,
  RETRY_DELAY_BASE: 1000,

  /** Help/FAQ animation delays */
  FAQ_EXPAND_DURATION: 300,
  FAQ_SCROLL_DELAY: 350,

  /** Animation transition delays */
  TRANSITION_DELAY: 150,
  TUTORIAL_DELAY_SHORT: 500,
  TUTORIAL_DELAY_LONG: 800,

  /** Touch interaction delays */
  LONG_PRESS_DELAY: 500,

  /** Pulsating animation duration */
  PULSATE_DURATION: 1500,

  /** Stagger animation delays for sequential reveals */
  STAGGER: {
    BASE: 50,
    INCREMENT: 40,
    FAST: 100,
    MEDIUM: 120,
    SLOW: 180,
    /** Completion screen button delay with metrics shown */
    BUTTON_WITH_METRICS: 320,
    /** Completion screen button delay without metrics */
    BUTTON_WITHOUT_METRICS: 220,
  },
} as const;
