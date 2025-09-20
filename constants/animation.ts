import { Easing, useReducedMotion } from 'react-native-reanimated';

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
    damping: 18, // Higher damping for smoother feel
    stiffness: 140, // Higher stiffness for more responsive feel
    mass: 0.7, // Lighter mass for snappier response
    overshootClamping: false,
    energyThreshold: 0.01,
  },
  TOGGLE: {
    damping: 18, // Higher damping for smoother feel
    stiffness: 140, // Higher stiffness for more responsive feel
    mass: 0.4, // Lighter mass for snappier toggle feel
    overshootClamping: false,
    energyThreshold: 0.01,
  },
  SLIDE: {
    damping: 22, // Higher damping for very smooth sliding
    stiffness: 120, // Balanced stiffness for natural slide feel
    mass: 0.7, // Lighter mass for snappier sliding
    overshootClamping: false,
    energyThreshold: 0.01,
  },
} as const;

/** Minimum duration for opacity animations */
export const MIN_OPACITY_DURATION = 1;

/** Slight delay used when mounting components to avoid flashes */
export const MIN_MOUNT_DELAY = 5;

/** Default scale amounts used for press animations */
export const PRESS_SCALE = {
  BUTTON: 0.94, // More noticeable feedback for buttons
  CARD: 0.96, // More noticeable but still subtle for cards
} as const;

/** Scale amount for icon button press animations */
export const ICON_BUTTON_PRESS_SCALE = 0.9;

/** Default opacity reduction for card press animations */
export const CARD_PRESS_OPACITY = 0.97;

/** Scale value for toggle press feedback */
export const TOGGLE_PRESS_SCALE = 0.95;

/** Scale value used when pressing individual Arabic words */
export const WORD_PRESS_SCALE = 0.95;

/** Scale value applied when dragging cards */
export const CARD_DRAG_SCALE = 1.05;

/** Minimum progress value before triggering animations */
export const REVIEW_MIN_PROGRESS_VALUE = 1;

/** Default animation duration for UI feedback */
export const DEFAULT_ANIMATION_DURATION = 180; // Slightly faster for more responsive feel

/** Extra quick animation duration */
export const QUICK_ANIMATION_DURATION = 80; // Faster for snappy micro-interactions

/** Duration for rotation based animations */
export const ROTATION_ANIMATION_DURATION = 350; // Slightly faster for smoother feel

/** Starting offset for toast translate animations */
export const TOAST_INITIAL_TRANSLATE_Y = 50;

/** Spring config for toast translate animations */
export const TOAST_SPRING = {
  damping: 18, // Higher damping for smoother toast animations
  stiffness: 220, // Higher stiffness for more responsive feel
  mass: 0.8, // Lighter mass for snappier response
  overshootClamping: false,
  energyThreshold: 0.01,
} as const;

/** Threshold to hide the header when scrolling */
export const HEADER_SCROLL_THRESHOLD = 50;

/** Multiplier applied to list item height for overscroll draw distance */
export const LIST_DRAW_DISTANCE_MULTIPLIER = 3;

/** Larger multiplier used for sentence lists */
export const SENTENCE_DRAW_DISTANCE_MULTIPLIER = 12;

/** Default scroll event throttle for smooth animations */
export const SCROLL_EVENT_THROTTLE = 16;

/** Spring config for ArticleCard scale animation */
export const ARTICLE_CARD_SPRING = {
  damping: 22, // Higher damping for smoother, more refined feel
  stiffness: 350, // Higher stiffness for more responsive, snappy feel
  mass: 0.6, // Lighter mass for quicker response
  overshootClamping: false,
  energyThreshold: 0.01,
} as const;

/** Delay before completion metrics appear */
export const COMPLETION_METRIC_BASE_DELAY = 800;

/** Delay step between each completion metric */
export const COMPLETION_METRIC_STAGGER = 150;

/** Delay before the continue button appears */
export const COMPLETION_BUTTON_DELAY = {
  BASE: 1000,
  WITH_METRICS: 1400,
} as const;

/** Animation duration for progress bars */
export const PROGRESS_BAR_ANIMATION_DURATION = 400; // Faster for more responsive progress feedback

/** Spring config for toast scale animations */
export const TOAST_SCALE_SPRING = {
  IMPORTANT: { damping: 10, stiffness: 280, mass: 0.3 }, // More responsive for important toasts
  DEFAULT: { damping: 12, stiffness: 220, mass: 0.4 }, // Smoother for default toasts
} as const;

export const TOAST_SCALE_CONFIG = {
  IMPORTANT: { initialScale: 0.2, overshoot: 1.15 },
  DEFAULT: { initialScale: 0.3, overshoot: 1.1 },
} as const;

/** Default toast visibility duration */
export const DEFAULT_TOAST_DURATION = 4000;

/** Duration for icon entrance animations */
export const ICON_ENTRANCE_DURATION = 300; // Faster for snappier icon entrances

/** Duration for component entrance animations */
export const COMPONENT_ENTRANCE_DURATION = 250; // Faster for more responsive component entrances

/** Delay before completion title appears */
export const COMPLETION_TITLE_DELAY = 400;

/** Delay before completion subtitle appears */
export const COMPLETION_SUBTITLE_DELAY = 600;

/**
 * General timing constants for delays, timeouts, and intervals
 */
export const TIMING_CONSTANTS = {
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
} as const;

/**
 * Hook for detecting user's reduced motion preference
 * Use this in animation hooks to conditionally disable animations for accessibility
 */
export const useAnimationConfig = () => {
  const reducedMotion = useReducedMotion();

  return {
    shouldAnimate: !reducedMotion,
    // For users with reduced motion, use minimal duration to maintain functionality
    duration: reducedMotion ? 1 : undefined,
    springConfig: reducedMotion
      ? { damping: 100, stiffness: 1000, mass: 1 } // Very stiff spring for minimal movement
      : undefined,
  };
};
