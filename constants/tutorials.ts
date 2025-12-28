/**
 * Tutorial system constants
 * Defines all tutorial IDs, configurations, and timing for the progressive disclosure tutorial system
 */

/**
 * Tutorial identifiers (branded type pattern for type safety)
 */
export const TutorialId = {
  WORD_TAP: 'wordTap',
  SWIPE_GESTURE: 'swipeGesture',
} as const;

export type TutorialId = (typeof TutorialId)[keyof typeof TutorialId];

/**
 * Swipe tutorial step indices (full tutorial flow)
 * Note: HINT step was removed - hesitation detection replaced tap-to-reveal
 */
export const SwipeTutorialStep = {
  INTRO: 0,
  SWIPE_LEFT: 1,
  SWIPE_RIGHT: 2,
  SRS_EXPLAIN: 3,
} as const;

export type SwipeTutorialStep = (typeof SwipeTutorialStep)[keyof typeof SwipeTutorialStep];

/**
 * Contextual help types (single-step help triggered by tapping icons)
 * Note: HINT was removed - hesitation detection replaced tap-to-reveal
 */
export const ContextualHelpType = {
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
} as const;

export type ContextualHelpType = (typeof ContextualHelpType)[keyof typeof ContextualHelpType];

/**
 * Configuration for a single tutorial
 */
interface TutorialConfig {
  /** AsyncStorage key for completion state */
  storageKey: string;
  /** Auto-dismiss delay in milliseconds (optional - if not set, requires manual dismiss) */
  autoDismissDelay?: number;
  /** Delay before showing tutorial in milliseconds */
  showDelay: number;
}

/**
 * All tutorial configurations
 * Maps each TutorialId to its complete configuration
 */
export const TUTORIALS: Record<TutorialId, TutorialConfig> = {
  [TutorialId.WORD_TAP]: {
    storageKey: '@openarabic/tutorials/wordTapCompleted',
    showDelay: 800,
  },
  [TutorialId.SWIPE_GESTURE]: {
    storageKey: '@openarabic/tutorials/swipeGestureCompleted',
    showDelay: 500,
  },
};

/**
 * Animation timing constants
 */
export const TUTORIAL_ANIMATION = {
  FADE_IN_DURATION: 300,
  FADE_OUT_DURATION: 200,
  BOUNCE_DURATION: 800,
} as const;

/**
 * Fixed height for tutorial step content area
 * Prevents modal from resizing between steps
 */
export const TUTORIAL_STEP_HEIGHT = 280;

/**
 * Shared tutorial visual constants
 * Ensures consistency across all tutorial steps
 */
export const TUTORIAL_VISUALS = {
  /** Main gesture icon size (hand, sparkles) */
  ICON_SIZE: 40,
  /** Circular indicator dimensions */
  INDICATOR_SIZE: 36,
  /** Icons inside indicators */
  INDICATOR_ICON_SIZE: 20,
} as const;
