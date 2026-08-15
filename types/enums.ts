/**
 * Core application enums for better type safety and organization
 * Groups related constants and provides type-safe access patterns
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

// ===== DAILY WORD LIMITS =====

/**
 * Daily word limit tiers for vocabulary acquisition
 * Using const object for zero runtime overhead
 */
export const DailyWordLimitTier = {
  GETTING_STARTED: 'Getting Started',
  STEADY_PROGRESS: 'Steady Progress',
  ACTIVE_LEARNING: 'Active Learning',
  UNLIMITED: 'Unlimited',
} as const;

export type DailyWordLimitTier = (typeof DailyWordLimitTier)[keyof typeof DailyWordLimitTier];

/**
 * Descriptions for daily word limit tiers
 * Using const object for zero runtime overhead
 */
export const DailyWordLimitDescription = {
  GETTING_STARTED: '10 new words per day',
  STEADY_PROGRESS: '20 new words per day',
  ACTIVE_LEARNING: '30 new words per day',
  UNLIMITED: 'No daily limit — reviews may grow quickly',
} as const;

export type DailyWordLimitDescription =
  (typeof DailyWordLimitDescription)[keyof typeof DailyWordLimitDescription];

/**
 * Daily word limit status messages
 * Using const object for zero runtime overhead
 */
export const DailyWordLimitStatus = {
  REACHED: 'Daily limit reached. You can increase it in Account settings.',
  PAUSED_LOW_RECALL:
    'New words paused — your recent recall dipped. Review what you have, and they’ll resume.',
} as const;

export type DailyWordLimitStatus = (typeof DailyWordLimitStatus)[keyof typeof DailyWordLimitStatus];

// ===== ACCOUNT SECTIONS =====

/**
 * Account section categories for organization
 * Using const object for zero runtime overhead
 */
export const AccountSection = {
  AUDIO_PLAYBACK: 'Audio',
  LEARNING: 'Learning',
  SUPPORT: 'Help',
} as const;

export type AccountSection = (typeof AccountSection)[keyof typeof AccountSection];

// ===== FONT OPTIONS =====

/**
 * Available Arabic fonts
 * Using const object for zero runtime overhead
 */
export const ArabicFont = {
  MADINA: 'Madina',
  AMIRI: 'Amiri',
  SCHEHERAZADE: 'Scheherazade',
  NASTALIQ: 'Nastaliq',
  NOTO_SANS: 'Noto Sans',
} as const;

export type ArabicFont = (typeof ArabicFont)[keyof typeof ArabicFont];

/**
 * Font descriptions for UI display
 * Using const object for zero runtime overhead
 */
export const FontDescription = {
  MADINA: 'Modern & clean',
  AMIRI: 'Traditional',
  SCHEHERAZADE: 'Flowing',
  NASTALIQ: 'Calligraphic',
  NOTO_SANS: 'Simple',
} as const;

export type FontDescription = (typeof FontDescription)[keyof typeof FontDescription];

// ===== NAVIGATION & UI ACTIONS =====

/**
 * Main app navigation tabs
 * Using const object for zero runtime overhead
 */
export const AppTab = {
  EXPLORE: 'Explore',
  PLAYLIST: 'Playlist',
  PRACTICE: 'Practice',
} as const;

export type AppTab = (typeof AppTab)[keyof typeof AppTab];

/**
 * Common UI action buttons
 * Using const object for zero runtime overhead
 */
export const UiAction = {
  SORT_BY: 'Sort',
  ALL_WORDS: 'All Words',
  FILTERS: 'Filters',
  RESET_FILTERS: 'Reset',
  RESET: 'Reset',
  AUTHORS: 'Authors',
  DIFFICULTY: 'Difficulty',
  CATEGORY: 'Category',
  FILTER: 'Filter',
  REFRESH: 'Refresh',
  DONE: 'Done',
  EDIT: 'Edit',
  MANAGE: 'Manage',
  CLOSE: 'Close',
  BACK: 'Back',
  CANCEL: 'Cancel',
  CLEAR: 'Clear',
  CONTINUE: 'Continue',
} as const;

export type UiAction = (typeof UiAction)[keyof typeof UiAction];

// ===== NOTIFICATION & TOAST TYPES =====

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
 * FAQ categories for organizing help content
 * Using const object for zero runtime overhead
 */
export const FAQCategory = {
  GETTING_STARTED: 'Getting Started',
  FEATURES: 'Features',
  OFFLINE_STORAGE: 'Offline & storage',
  LEARNING_APPROACH: 'Learning approach',
  PRIVACY_DATA: 'Privacy & data',
} as const;

export type FAQCategory = (typeof FAQCategory)[keyof typeof FAQCategory];
