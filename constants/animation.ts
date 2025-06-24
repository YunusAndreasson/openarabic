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

/** Scale amount for icon button press animations */
export const ICON_BUTTON_PRESS_SCALE = 0.9;

/** Scale amount for insights button press animation */
export const INSIGHTS_BUTTON_PRESS_SCALE = 0.98;

/** Default opacity reduction for card press animations */
export const CARD_PRESS_OPACITY = 0.97;

/** Scale value for toggle press feedback */
export const TOGGLE_PRESS_SCALE = 0.95;

/** Scale value used when pressing individual Arabic words */
export const WORD_PRESS_SCALE = 0.95;

/** Scale value applied when dragging cards */
export const CARD_DRAG_SCALE = 1.05;

/** Ratio of screen width required to trigger a review card swipe */
export const REVIEW_CARD_SWIPE_THRESHOLD_RATIO = 0.04;

/** Delay before resetting card position after swipe */
export const REVIEW_CARD_RESET_DELAY = 50;

/** Minimum gesture distance before activating swipe */
export const REVIEW_CARD_MIN_DISTANCE = 0.1;

/** Threshold for skipping progress animations if change is tiny */
export const PROGRESS_SKIP_THRESHOLD = 50;

/** Maximum progress value representing 100% */
export const PROGRESS_MAX_VALUE = 10000;

/** Minimum progress value before triggering animations */
export const REVIEW_MIN_PROGRESS_VALUE = 1;

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

/** Multiplier applied to list item height for overscroll draw distance */
export const LIST_DRAW_DISTANCE_MULTIPLIER = 5;

/** Larger multiplier used for sentence lists */
export const SENTENCE_DRAW_DISTANCE_MULTIPLIER = 12;

/** Default scroll event throttle for smooth animations */
export const SCROLL_EVENT_THROTTLE = 16;

/** Scale value used when dismissing the Now Playing card */
export const NOW_PLAYING_DISMISS_SCALE = 0.92;

/** Shared height for the Now Playing card component */
export const NOW_PLAYING_CARD_HEIGHT = 120;

/** Offset used to position the Now Playing card off-screen */
export const NOW_PLAYING_HIDDEN_OFFSET = 100;

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

/** Scale amount for stop button press animation */
export const NOW_PLAYING_STOP_PRESS_SCALE = 0.85;

/** Spring config for completion screen icon */
export const COMPLETION_ICON_SPRING = {
  damping: 12,
  stiffness: 100,
} as const;

/** Delay before showing instruction footer */
export const INSTRUCTION_ANIMATION_DELAY = 500;

/** Spring config for ArticleCard scale animation */
export const ARTICLE_CARD_SPRING = {
  damping: 20,
  stiffness: 300,
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
export const PROGRESS_BAR_ANIMATION_DURATION = 500;

/** Spring config for toast scale animations */
export const TOAST_SCALE_SPRING = {
  IMPORTANT: { damping: 6, stiffness: 250, mass: 0.4 },
  DEFAULT: { damping: 8, stiffness: 200, mass: 0.5 },
} as const;

export const TOAST_SCALE_CONFIG = {
  IMPORTANT: { initialScale: 0.2, overshoot: 1.15 },
  DEFAULT: { initialScale: 0.3, overshoot: 1.1 },
} as const;

/** Default toast visibility duration */
export const DEFAULT_TOAST_DURATION = 4000;

/** Duration for icon entrance animations */
export const ICON_ENTRANCE_DURATION = 400;

/** Delay before completion title appears */
export const COMPLETION_TITLE_DELAY = 400;

/** Delay before completion subtitle appears */
export const COMPLETION_SUBTITLE_DELAY = 600;
