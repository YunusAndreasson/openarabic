/**
 * Tutorial system constants
 * Defines all tutorial IDs, configurations, and timing for the progressive disclosure tutorial system
 */

/**
 * Tutorial identifiers (branded type pattern for type safety)
 */
export const TutorialId = {
  WELCOME_INTRO: 'welcomeIntro',
  WORD_TAP: 'wordTap',
  SWIPE_GESTURE: 'swipeGesture',
} as const;

export type TutorialId = (typeof TutorialId)[keyof typeof TutorialId];

/**
 * Review tutorial step indices: how it works → the three grades → ready.
 */
export const ReviewTutorialStep = {
  INTRO: 0,
  GRADES: 1,
  READY: 2,
} as const;

export type ReviewTutorialStep = (typeof ReviewTutorialStep)[keyof typeof ReviewTutorialStep];

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
  [TutorialId.WELCOME_INTRO]: {
    storageKey: '@openarabic/tutorials/welcomeIntroSeen',
    showDelay: 600,
  },
  [TutorialId.WORD_TAP]: {
    storageKey: '@openarabic/tutorials/wordTapCompleted',
    showDelay: 800,
  },
  [TutorialId.SWIPE_GESTURE]: {
    // Key bumped again for the three-grade rewrite: the previous version taught
    // a binary swipe and never mentioned "Guessed", so existing users should see
    // the corrected tutorial once.
    storageKey: '@openarabic/tutorials/reviewGradesCompleted',
    showDelay: 500,
  },
};

/**
 * Animation timing constants
 */
export const TUTORIAL_ANIMATION = {
  FADE_IN_DURATION: 300,
  FADE_OUT_DURATION: 200,
} as const;

/**
 * Floor for the tutorial step content area.
 * Keeps the modal from visibly resizing between steps of similar length — but a
 * minimum, not a fixed height, so a two-line title or a large system font scale
 * grows the card instead of clipping.
 */
export const TUTORIAL_STEP_MIN_HEIGHT = 240;

/**
 * Shared tutorial visual constants
 * Ensures consistency across all tutorial steps
 */
export const TUTORIAL_VISUALS = {
  /** Hero icon inside the step's tinted halo (halo is 2x this) */
  ICON_SIZE: 40,
} as const;
