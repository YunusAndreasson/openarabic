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
 * Swipe tutorial step indices
 */
export const SwipeTutorialStep = {
  CORE_FLOW: 0,
  UNSURE_FLOW: 1,
} as const;

export type SwipeTutorialStep = (typeof SwipeTutorialStep)[keyof typeof SwipeTutorialStep];

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
export const TUTORIAL_STEP_HEIGHT = 240;
