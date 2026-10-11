/**
 * Core application enums.
 *
 * WHAT BELONGS HERE: a closed set of values the app *behaves* on — persisted in
 * the settings slice, switched on, or compared. Each is a `const` object plus
 * the union derived from it, so the values and the type cannot drift.
 *
 * WHAT DOES NOT: display copy. Seven "enums" here used to hold English UI text
 * — section headings, button labels, daily-limit tier names and their
 * subtitles — each alongside a derived union that nothing ever annotated with.
 * A union of English sentences carries no invariant, and the drift it invites
 * was already visible: `UiAction.CANCEL` and `UiAction.RESET` were byte-identical
 * duplicates of `STRINGS.CANCEL` and `STRINGS.RESET`, and three of the account
 * screen's section headings came from here while its other eight came from
 * `STRINGS`. The copy now lives in `constants/strings.ts`, the file that owns it.
 */

// ===== SETTINGS & PREFERENCES =====

/**
 * Audio language preferences for content playback
 * Using const object for zero runtime overhead
 */
export const AudioLanguage = {
  ARABIC_ONLY: 'arabic',
  ENGLISH_ARABIC: 'bilingual',
} as const;

export type AudioLanguage = (typeof AudioLanguage)[keyof typeof AudioLanguage];

/**
 * Display language preferences for UI text
 * Using const object for zero runtime overhead
 */
export const DisplayLanguage = {
  ARABIC_ONLY: 'arabic',
  ARABIC_ENGLISH: 'bilingual',
} as const;

export type DisplayLanguage = (typeof DisplayLanguage)[keyof typeof DisplayLanguage];

// ===== NAVIGATION & UI =====

/**
 * Main app navigation tabs
 * Using const object for zero runtime overhead
 */
export const AppTab = {
  EXPLORE: 'Explore',
  PLAYLIST: 'Playlist',
  PRACTICE: 'Practice',
  ACCOUNT: 'Account',
} as const;

export type AppTab = (typeof AppTab)[keyof typeof AppTab];

/**
 * Toast notification types for user feedback
 * Using const object for zero runtime overhead
 */
export const ToastType = {
  ERROR: 'error',
  IMPORTANT: 'important',
  INFO: 'info',
  SUCCESS: 'success',
} as const;

export type ToastType = (typeof ToastType)[keyof typeof ToastType];

// ===== FAQ SYSTEM =====

/**
 * FAQ categories for organizing help content.
 *
 * Earns its place unlike the copy that left this file: the union types
 * `FAQItem.category`, so every entry in `FAQ_DATA` is grouped under a heading
 * that exists rather than one spelled slightly differently.
 */
export const FAQCategory = {
  GETTING_STARTED: 'Getting started',
  FEATURES: 'Features',
  OFFLINE_STORAGE: 'Offline & storage',
  LEARNING_APPROACH: 'Learning approach',
  PRIVACY_DATA: 'Privacy & data',
} as const;

export type FAQCategory = (typeof FAQCategory)[keyof typeof FAQCategory];
