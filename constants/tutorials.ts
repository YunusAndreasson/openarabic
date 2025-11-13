/**
 * Tutorial system constants
 * Defines all tutorial IDs, configurations, and strings for the progressive disclosure tutorial system
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
 * Configuration for a single tutorial
 */
interface TutorialConfig {
  /** Unique identifier */
  id: TutorialId;
  /** AsyncStorage key for completion state */
  storageKey: string;
  /** Tutorial title */
  title: string;
  /** Tutorial description */
  description: string;
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
    id: TutorialId.WORD_TAP,
    storageKey: '@openarabic/tutorials/wordTapCompleted',
    title: 'All Arabic words are tappable',
    description: 'Tap any Arabic word to see its meaning and add it to your practice list',
    showDelay: 800,
    // Completed when user taps any word
  },
  [TutorialId.SWIPE_GESTURE]: {
    id: TutorialId.SWIPE_GESTURE,
    storageKey: '@openarabic/tutorials/swipeGestureCompleted',
    title: 'How to practice',
    description: '',
    showDelay: 500,
  },
};

/**
 * Animation timing constants
 */
export const TUTORIAL_ANIMATION = {
  FADE_IN_DURATION: 300,
  FADE_OUT_DURATION: 200,
  PULSE_DURATION: 1000,
  BOUNCE_DURATION: 800,
} as const;
