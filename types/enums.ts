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

/**
 * Available app themes
 * Using const object for zero runtime overhead
 */
export const ThemeName = {
  BIRCHES: 'Birches in Spring',
  MIDNIGHT: 'Midnight Summer',
  AUTUMN: 'Autumn Leaves',
} as const;

export type ThemeName = (typeof ThemeName)[keyof typeof ThemeName];

// ===== DAILY WORD LIMITS =====

/**
 * Daily word limit tiers for vocabulary acquisition
 */
export enum DailyWordLimitTier {
  GETTING_STARTED = 'Getting Started',
  STEADY_PROGRESS = 'Steady Progress',
  ACTIVE_LEARNING = 'Active Learning',
  UNLIMITED = 'Unlimited',
}

/**
 * Descriptions for daily word limit tiers
 */
export enum DailyWordLimitDescription {
  GETTING_STARTED = '10 words per day - Perfect for beginners',
  STEADY_PROGRESS = '20 words per day - Balanced learning pace',
  ACTIVE_LEARNING = '30 words per day - For dedicated learners',
  UNLIMITED = 'No daily limit - Review load may increase significantly',
}

/**
 * Daily word limit status messages
 */
export enum DailyWordLimitStatus {
  REACHED = 'Daily limit reached. You can increase it in Account settings.',
  APPROACHING = 'Approaching daily limit',
}

/**
 * Daily word limit status descriptions
 */
export enum DailyWordLimitStatusDescription {
  REACHED = "Complete today's reviews before adding more words",
  APPROACHING = "You're close to your daily word limit",
}

// ===== ACCOUNT SECTIONS =====

/**
 * Account section categories for organization
 */
export enum AccountSection {
  READING_EXPERIENCE = 'Reading experience',
  AUDIO_PLAYBACK = 'Audio',
  LEARNING = 'Learning',
  SUPPORT = 'Support',
  ABOUT = 'About',
  DATA_ACCOUNT = 'Account',
}

// ===== PRACTICE SYSTEM =====

/**
 * Practice state labels for word confidence
 */
export enum PracticeState {
  UNKNOWN = 'Unknown',
  UNSURE = 'Unsure',
  KNOWN = 'Known',
}

/**
 * Vocabulary statistics categories
 */
export enum VocabularyStatCategory {
  DUE = 'Due',
  LEARNING = 'Learning',
  MASTERED = 'Mastered',
  TOTAL = 'Total words',
}

// ===== FONT OPTIONS =====

/**
 * Available Arabic fonts
 */
export enum ArabicFont {
  MADINA = 'Madina',
  AMIRI = 'Amiri',
  SCHEHERAZADE = 'Scheherazade',
  NASTALIQ = 'Nastaliq',
  NOTO_SANS = 'Noto Sans',
}

/**
 * Font descriptions for UI display
 */
export enum FontDescription {
  MADINA = 'Modern & clean',
  AMIRI = 'Traditional',
  SCHEHERAZADE = 'Flowing',
  NASTALIQ = 'Calligraphic',
  NOTO_SANS = 'Simple',
}

// ===== DIFFICULTY LEVELS =====

/**
 * Content difficulty levels
 * Using const object for zero runtime overhead
 */
export const ContentDifficulty = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;

export type ContentDifficulty = (typeof ContentDifficulty)[keyof typeof ContentDifficulty];

// ===== NAVIGATION & UI ACTIONS =====

/**
 * Main app navigation tabs
 * Using const object for zero runtime overhead
 */
export const AppTab = {
  EXPLORE: 'Explore',
  SAVED: 'Saved',
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

// ===== AUDIO CONTROLS =====

/**
 * Audio playback actions
 * Using const object for zero runtime overhead
 */
export const AudioAction = {
  REPEAT: 'Repeat',
  PLAY_ALL: 'Play all',
  PLAY_NOW: 'Play',
  STOP: 'Stop',
  REMOVE: 'Remove',
  LISTEN_LATER: 'Listen later',
} as const;

export type AudioAction = (typeof AudioAction)[keyof typeof AudioAction];

/**
 * Sleep timer actions
 */
export enum SleepTimerAction {
  START = 'Start',
  CANCEL = 'Cancel',
}

// ===== WORD MANAGEMENT =====

/**
 * Word difficulty adjustment actions
 */
export enum WordDifficultyAction {
  MAKE_EASIER = 'Reduce difficulty',
  REDUCE_DIFFICULTY_LEVEL = 'Reduce difficulty level',
  MARK_EASY = 'Mark easy',
  SHOW_MORE_OFTEN = 'Show more',
  MARK_HARD = 'Mark hard',
  SHOW_LESS_OFTEN = 'Show less',
  NEEDS_PRACTICE = 'Needs practice',
}

/**
 * Word management actions
 */
export enum WordManagementAction {
  SKIP_TODAY = 'Skip today',
  HIDE_FROM_SESSION = 'Hide this session',
  RESET_PROGRESS = 'Reset progress',
  START_OVER = 'Start over',
  STOP_STUDYING = 'Stop practicing',
  REMOVE_FROM_LIST = 'Remove from list',
}

// ===== REVIEW ACTIONS =====

/**
 * Practice confidence actions
 * Using const object for zero runtime overhead
 */
export const ReviewAction = {
  DONT_KNOW: 'Unknown',
  KNOW: 'Known',
  STUDY_DUE_WORDS: 'Practice Due',
} as const;

export type ReviewAction = (typeof ReviewAction)[keyof typeof ReviewAction];

// ===== LEARNING PHASES =====

/**
 * Learning capacity phases
 */
export enum LearningPhase {
  READY_TO_ADD = 'Add new words',
  PRACTICE_MORE_FIRST = 'Build capacity',
  FOCUS_ON_CURRENT = 'Preserve memory',
}

// ===== UTILITY TYPES =====

/**
 * Helper type to get all values from an enum
 */
export type EnumValues<T> = T[keyof T];

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
 */
export enum FAQCategory {
  GETTING_STARTED = 'Getting Started',
  FEATURES = 'Features',
  OFFLINE_STORAGE = 'Offline & storage',
  LEARNING_APPROACH = 'Learning approach',
  PRIVACY_DATA = 'Privacy & data',
}

// ===== LAYOUT & SPACING =====

/**
 * Standardized spacing scale for consistent layout
 */
export enum SpacingScale {
  MICRO = 'micro',
  HALF_TINY = 'half_tiny',
  TINY = 'tiny',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge',
  XXLARGE = 'xxlarge',
  XXXLARGE = 'xxxlarge',
}

// ===== UTILITY FUNCTIONS =====

/**
 * Type-safe way to get enum values as array
 */
export const getEnumValues = <T extends Record<string, string | number>>(
  enumObj: T,
): EnumValues<T>[] => {
  return Object.values(enumObj) as EnumValues<T>[];
};
