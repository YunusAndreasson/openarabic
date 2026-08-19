/**
 * Tutorial system constants
 * Defines all tutorial IDs, configurations, and timing for the progressive disclosure tutorial system
 */

import { STORAGE_KEYS } from '@/constants/storageKeys';

/**
 * Tutorial identifiers (branded type pattern for type safety)
 */
export const TutorialId = {
  WELCOME_INTRO: 'welcomeIntro',
  WORD_TAP: 'wordTap',
  REVIEW_GRADES: 'reviewGrades',
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
    storageKey: STORAGE_KEYS.TUTORIAL_WELCOME_INTRO,
    showDelay: 600,
  },
  [TutorialId.WORD_TAP]: {
    storageKey: STORAGE_KEYS.TUTORIAL_WORD_TAP,
    showDelay: 800,
  },
  [TutorialId.REVIEW_GRADES]: {
    // The storage key — NOT this id — is what gates whether a user sees the
    // tutorial, so bumping the key is the only way to re-show it.
    //
    // Bumped for the swipe removal. This is not about the reworded sentence: an
    // interaction the tutorial actively TAUGHT was deleted, so everyone who
    // completed the old version is carrying a gesture that now does nothing,
    // with no other surface in the app to correct them. Re-showing once is the
    // cheapest way to say so.
    storageKey: STORAGE_KEYS.TUTORIAL_REVIEW_GRADES,
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
