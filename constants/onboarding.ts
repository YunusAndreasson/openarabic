/**
 * Onboarding constants
 * First-run "Get started" checklist and welcome intro configuration.
 * Completion flags are stored as a single JSON blob (see utils/onboardingStorage.ts).
 */

/**
 * Checklist step identifiers (branded type pattern for type safety).
 * Values double as the boolean field names in OnboardingProgressState.
 */
export const OnboardingStep = {
  READ_TEXT: 'readFirstText',
  SAVE_WORD: 'saveFirstWord',
  LISTEN_AUDIO: 'listenToAudio',
} as const;

export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

/** AsyncStorage key holding the whole onboarding progress blob */
export const ONBOARDING_STORAGE_KEY = '@openarabic/onboarding/progress';

/**
 * Persisted onboarding progress.
 * `initializedAt` is written once eligibility has been evaluated; until then the
 * checklist and welcome intro stay hidden (fail-safe against showing to an
 * unknown cohort). `dismissed: true` permanently suppresses both surfaces.
 */
export interface OnboardingProgressState {
  version: number;
  initializedAt?: string;
  dismissed: boolean;
  readFirstText: boolean;
  saveFirstWord: boolean;
  listenToAudio: boolean;
  completedAt?: string;
}

export const ONBOARDING_STATE_VERSION = 1;

export const ONBOARDING_CONFIG = {
  /** Accounts older than this are treated as established and never see onboarding */
  ESTABLISHED_ACCOUNT_AGE_DAYS: 14,
  /** Pause after the third checkmark before the card collapses away */
  CHECKLIST_COLLAPSE_DELAY_MS: 900,
  /** Duration of the height/opacity collapse animation */
  CHECKLIST_COLLAPSE_DURATION_MS: 300,
} as const;
