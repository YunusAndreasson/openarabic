/**
 * Core application enums for better type safety and organization
 * Groups related constants and provides type-safe access patterns
 */

// ===== APP FEATURES & CAPABILITIES =====

/**
 * Core app features that define the OpenArabic learning system
 */
export enum AppFeature {
  WORKS_WITH_SCREEN_OFF = 'Works with screen off',
  COMPLETE_LINGUISTIC_SYSTEM = 'Complete linguistic system',
  RICH_VOCABULARY_INPUT = 'Rich vocabulary input',
  AUTHENTIC_LANGUAGE_PATTERNS = 'Authentic language patterns',
  CULTURAL_FRAMEWORK = 'Cultural and conceptual framework',
  ACQUISITION_NOT_LEARNING = 'Acquisition, not learning',
  FOCUS_ON_MEANING = 'Focus on meaning',
  NATURAL_PROCESS = 'Natural process',
}

// ===== SETTINGS & PREFERENCES =====

/**
 * Audio language preferences for content playback
 */
export enum AudioLanguage {
  ARABIC_ONLY = 'arabic',
  ENGLISH_ARABIC = 'bilingual',
}

/**
 * Display language preferences for UI text
 */
export enum DisplayLanguage {
  ARABIC_ONLY = 'arabic',
  ARABIC_ENGLISH = 'bilingual',
}

/**
 * Available app themes
 */
export enum ThemeName {
  BIRCHES = 'Birches in Spring',
  MIDNIGHT = 'Midnight Summer',
  AUTUMN = 'Autumn Leaves',
}

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
  REACHED = 'Daily limit reached',
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
  AUDIO_BOOKMARKS = 'Audio & bookmarks',
  APP_ACCOUNT = 'App & account',
  HELP_SUPPORT = 'Help & support',
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

// ===== MEMORY STRENGTH SYSTEM =====

/**
 * Memory strength levels for the 3-phase system
 */
export enum MemoryStrengthLevel {
  LOW = 'Low memory strength',
  MEDIUM = 'Medium memory strength',
  HIGH = 'High memory strength',
}

/**
 * Memory retention phases in the 3-phase system
 */
export enum MemoryRetentionPhase {
  PRESERVE_MEMORY = 'Preserve memory',
  CONSOLIDATE = 'Consolidate',
  READY_TO_ADD = 'Ready to add',
}

/**
 * Phase recommendations for user guidance
 */
export enum PhaseRecommendation {
  RED = 'Your review load is high. Clear due reviews before adding new words.',
  ORANGE = 'Some words need consolidation. Strengthen them first; add a few only if reviews stay steady.',
  GREEN = "Your load is balanced. It's a good time to add new words while keeping up daily reviews.",
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
 */
export enum ContentDifficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

// ===== NAVIGATION & UI ACTIONS =====

/**
 * Main app navigation tabs
 */
export enum AppTab {
  READ = 'Library',
  LISTEN = 'Bookmarks',
  PRACTICE = 'Study',
}

/**
 * Common UI action buttons
 * Using const object for zero runtime overhead
 */
export const UiAction = {
  SORT_BY: 'Sort',
  DICTIONARY: 'Dictionary',
  FILTERS: 'Filters',
  RESET_FILTERS: 'Reset',
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

// eslint-disable-next-line @typescript-eslint/no-redeclare
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

// eslint-disable-next-line @typescript-eslint/no-redeclare
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
  NEEDS_PRACTICE = 'Needs study',
}

/**
 * Word management actions
 */
export enum WordManagementAction {
  SKIP_TODAY = 'Skip today',
  HIDE_FROM_SESSION = 'Hide this session',
  RESET_PROGRESS = 'Reset progress',
  START_OVER = 'Start over',
  STOP_STUDYING = 'Stop studying',
  REMOVE_FROM_LIST = 'Remove from list',
}

// ===== REVIEW ACTIONS =====

/**
 * Review confidence actions
 * Using const object for zero runtime overhead
 */
export const ReviewAction = {
  DONT_KNOW: "Don't know",
  KNOW: 'Know',
  STUDY_DUE_WORDS: 'Review Due Words',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
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

// eslint-disable-next-line @typescript-eslint/no-redeclare
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

// ===== ERROR TYPES =====

/**
 * Error categories for better error handling and analytics
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  AUDIO = 'audio',
  STORAGE = 'storage',
  SYNC = 'sync',
  UNKNOWN = 'unknown',
}

// ===== ANIMATION & TIMING =====

/**
 * Animation timing presets for consistent motion design
 */
export enum AnimationTiming {
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow',
  GENTLE = 'gentle',
}

/**
 * Animation spring presets for common interactions
 */
export enum AnimationSpring {
  BUTTON = 'button',
  CARD = 'card',
  TOGGLE = 'toggle',
  SLIDE = 'slide',
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

// ===== FILE & MEDIA TYPES =====

/**
 * Supported file types for media handling
 */
export enum FileType {
  AUDIO = 'audio',
  IMAGE = 'image',
  TEXT = 'text',
  JSON = 'json',
}

// ===== CALENDAR & DATE TYPES =====

/**
 * Hijri months for Islamic calendar functionality
 */
export enum HijriMonth {
  MUHARRAM = 'Muharram',
  SAFAR = 'Safar',
  RABI_AL_AWWAL = "Rabi' al-Awwal",
  RABI_AL_THANI = "Rabi' al-Thani",
  JUMADA_AL_AWWAL = 'Jumada al-Awwal',
  JUMADA_AL_THANI = 'Jumada al-Thani',
  RAJAB = 'Rajab',
  SHABAN = "Sha'ban",
  RAMADAN = 'Ramadan',
  SHAWWAL = 'Shawwal',
  DHU_AL_QIDAH = "Dhu al-Qi'dah",
  DHU_AL_HIJJAH = 'Dhu al-Hijjah',
}

// ===== UTILITY FUNCTIONS =====

/**
 * Type-safe way to get enum values as array
 */
export const getEnumValues = <T extends Record<string, string | number>>(
  enumObj: T
): EnumValues<T>[] => {
  return Object.values(enumObj) as EnumValues<T>[];
};
