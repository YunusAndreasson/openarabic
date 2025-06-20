// Helper functions for consistent messaging
const tryAgain = 'Try again';
const checkConnection = 'Check connection and try again';
const cleared = (item: string) => `${item} cleared`;

export const STRINGS = {
  // Core app features
  WORKS_WITH_SCREEN_OFF: 'Works with screen off',
  COMPLETE_LINGUISTIC_SYSTEM: 'Complete linguistic system',
  RICH_VOCABULARY_INPUT: 'Rich vocabulary input',
  AUTHENTIC_LANGUAGE_PATTERNS: 'Authentic language patterns',
  CULTURAL_AND_CONCEPTUAL_FRAMEWORK: 'Cultural and conceptual framework',
  ACQUISITION_NOT_LEARNING: 'Acquisition, not learning',
  FOCUS_ON_MEANING: 'Focus on meaning',
  NATURAL_PROCESS: 'Natural process',

  // Settings & preferences
  STUDY_REMINDERS: 'Study reminders',
  TIME: 'Time',
  DARK_MODE: 'Dark mode',
  ARABIC_FONT: 'Arabic font',

  // Content states
  LOADING_PLAYLIST: 'Loading playlist',
  CONTENT_NOT_FOUND: 'Content not found',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  PLEASE_TRY_AGAIN: tryAgain,
  LOADING: 'Loading...',
  LOADING_ARTICLES: 'Loading articles...',
  LOADING_CHART: 'Loading chart...',
  PREPARING_AUDIO: 'Preparing audio',

  // Welcome & onboarding
  WELCOME_TITLE: 'Welcome to OpenArabic',
  WELCOME_SUBTITLE: 'Sign in to continue learning Arabic',

  // Navigation & controls - shortened button text
  SORT_BY: 'Sort',
  FILTERS: 'Filters',
  RESET_FILTERS: 'Reset',
  AUTHORS: 'Authors',
  DIFFICULTY: 'Difficulty',
  CATEGORY: 'Category',
  FILTER: 'Filter',
  REFRESH: 'Refresh',
  DONE: 'Done',
  EDIT: 'Edit',
  CLOSE: 'Close',
  BACK: 'Back',
  CANCEL: 'Cancel',
  CLEAR: 'Clear',
  CONTINUE: 'Continue',

  // Sorting options
  A_TO_Z: 'A-Z',
  Z_TO_A: 'Z-A',
  DATE_ADDED: 'Date added',
  TITLE_FILTER: 'Title',
  AUTHOR_FILTER: 'Author',

  // Practice state labels
  WORD_OPTIONS: 'Word options',
  UNKNOWN: 'Unknown',
  UNSURE: 'Unsure',
  KNOWN: 'Known',
  NO_TRANSLATION_AVAILABLE: 'No translation available',

  // Article & content actions - shortened and action-oriented
  BROWSE_ARTICLES: 'Browse',
  ARTICLES_SELECTED_FOR_YOU: 'Articles selected for you',
  SUMMARY: 'Summary',
  READ: 'Read',
  LISTEN: 'Listen',
  PRACTICE: 'Practice',

  // Audio controls - shortened button text
  REPEAT: 'Repeat',
  PLAY_ALL: 'Play all',
  PLAY_NOW: 'Play',
  STOP: 'Stop',
  REMOVE: 'Remove',
  LISTEN_LATER: 'Listen later',
  SLEEP_TIMER_TITLE: 'Sleep timer',
  SLEEP_TIMER_AUTOMATIC: 'Playback stops automatically',
  SLEEP_TIMER_CHOOSE_WHEN: 'Choose when to stop',
  TIMER: 'Timer',
  SET_TIME: 'Set time',
  START_TIMER: 'Start',
  CANCEL_TIMER: 'Cancel',
  REMAINING: 'remaining',
  MINUTES: '{minutes} min',

  // Empty states & hints - more actionable
  TRY_ADJUSTING_FILTERS: 'Try different filters',
  NO_ARTICLES_FOUND: 'No articles found',
  NO_ARTICLES_SAVED: 'No saved articles',
  LISTENING_PLAYLIST_EMPTY: 'Your playlist is empty',
  BOOKMARK_ARTICLES_HINT: 'Save articles from Read to build your playlist',
  LONG_PRESS_HINT: 'Long press to read article',
  PROGRESS_NOT_AVAILABLE: "Progress isn't available right now",
  ERROR_LOADING_DATA: "Couldn't load data",

  // Success messages
  SESSION_COMPLETE: 'Session complete!',
  ALL_WORDS_PRACTICED: 'All words practiced',
  ADDED_TO_LISTENING_LIST: 'Saved to playlist',
  REMOVED_FROM_LISTENING_LIST: 'Removed from playlist',
  ACCOUNT_CREATED: 'Account created',
  CHECK_EMAIL_CONFIRMATION: 'Check your email for confirmation',
  SUCCESS: 'Success',
  NEW_RECOMMENDATION_SELECTED: 'New recommendation selected',
  SELECTED_TO_HELP_PRACTICE_DUE: 'Selected to help practice due words',
  CHOSEN_TO_REINFORCE_CHALLENGING: 'Chosen to reinforce challenging words',
  PERFECT_FOR_GETTING_STARTED: 'Perfect for getting started',
  RANDOMLY_SELECTED_FOR_DISCOVERY: 'Randomly selected for discovery',

  // Auth - shortened and clearer
  CREATE_ACCOUNT: 'Create account',
  SIGN_IN: 'Sign in',
  SIGN_OUT: 'Sign out',
  HAVE_ACCOUNT_SIGN_IN: 'Have an account? Sign in',
  NEED_ACCOUNT_CREATE_ONE: 'Need an account? Create one',
  YOUR_EMAIL: 'Email',
  YOUR_PASSWORD: 'Password',
  PASSWORD_REQUIREMENTS_HINT:
    'At least {minLength} characters with uppercase, lowercase, and number',
  ARE_YOU_SURE_SIGN_OUT: 'Sign out?',

  // Word management actions - shortened
  SKIP_TODAY: 'Skip today',
  HIDE_FROM_CURRENT_SESSION: 'Hide this session',
  RESET_PROGRESS: 'Reset progress',
  START_OVER_WITH_THIS_WORD: 'Start over',
  STOP_STUDYING: 'Stop studying',
  REMOVE_FROM_VOCABULARY_LIST: 'Remove from list',
  MAKE_EASIER: 'Make easier',
  REDUCE_DIFFICULTY_LEVEL: 'Reduce difficulty',
  NEEDS_PRACTICE: 'Needs practice',
  SHOW_MORE_OFTEN: 'Show more',
  MARK_EASY: 'Mark easy',
  SHOW_LESS_OFTEN: 'Show less',
  MARK_HARD: 'Mark hard',

  // Practice flow - simplified
  DUE_NOW: 'Due now',
  CHALLENGING: 'Challenging',
  ALL_WORDS: 'All words',
  REGULAR_PRACTICE_FOR_SCHEDULED_WORDS: 'Practice scheduled words to make room for new ones',
  DRILL_DOWN_ON_CHALLENGING_WORDS: 'Master difficult words before adding more',
  ADDITIONAL_PRACTICE: 'Extra practice for all your words',

  // Insights & analytics
  INSIGHTS: 'Insights',
  INSIGHTS_UNAVAILABLE: 'Insights unavailable',
  INFO: 'Info',
  KEY_INSIGHTS: 'Key insights',
  WORD_MASTERY: 'Word mastery',
  LEARNING_PROGRESS: 'Learning progress',
  REVIEW_TIMING: 'Review timing',
  MEMORY_STRENGTH_ACROSS_VOCABULARY: 'Memory strength across vocabulary',
  VOCABULARY_ACQUISITION_VELOCITY: 'Vocabulary acquisition speed',
  MEMORY_RETENTION_OPTIMAL_TIMING: 'Memory retention and optimal timing',

  // Account & settings
  ACCOUNT: 'Account',
  SETTINGS: 'Settings',
  CONTACT_SUPPORT: 'Contact support',
  LANGUAGE_LEARNING_SCIENCE: 'Learning science',
  WHY_CLASSICAL_TEXTS: 'Why classical texts',
  CLASSICAL_TEXTS: 'Classical texts',
  LEARNING_METHOD: 'Learning method',
  TWITTER: 'Twitter',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  NO_EMAIL: 'No email',

  // Cache management - clearer and more actionable
  AUDIO_CACHE: 'Audio cache',
  CLEAR_AUDIO_CACHE: 'Clear audio',
  CLEAR_CACHE: 'Clear cache',
  NO_CACHE: 'No cache',
  NO_CACHED_AUDIO_FILES_TO_CLEAR: 'No cached audio to clear',
  NO_OFFLINE_DATA_CACHE_TO_CLEAR: 'No cached data to clear',
  NO_CACHED_FILES: 'No cached files',
  THIS_WILL_DELETE: 'This deletes',
  AUDIO_REDOWNLOAD_REQUIRED: 'Audio will re-download when needed',
  DATA_RELOAD_REQUIRED: 'Data will reload when needed',

  // Notifications
  ENABLE_NOTIFICATIONS: 'Enable notifications',
  TURN_ON_NOTIFICATIONS: 'Get daily study reminders',
  NOTIFICATIONS_DISABLED: 'Notifications disabled',
  NOTIFICATION_REMINDER_TITLE: 'Time to practice Arabic!',
  NOTIFICATION_REMINDER_BODY: 'Continue your Arabic learning journey',
  APP_ICON_BADGE: 'App icon badge',

  // Calendar & dates
  CALENDAR: 'Calendar',
  ISLAMIC_CALENDAR: 'Islamic calendar',
  DATE_RANGE: 'Date range',
  TODAY: 'Today',
  ALL_TIME: 'All time',
  PAST_WEEK: 'Past week',
  PAST_MONTH: 'Past month',
  DATE_VARIANCE_NOTE: 'Dates may vary by 1-2 days depending on moon sighting',
  AH: 'AH',
  DAY_OF_TEMPLATE: 'Day {day} of {duration}',

  // Learning capacity & guidance - more actionable
  ADD_WORDS_TO_SEE_CAPACITY: 'Practice first to add more words',
  ADD_NEW_WORDS: 'Ready for new words',
  ADD_WORDS_MODERATELY: 'Practice needed before new words',
  REVIEW_BEFORE_ADDING: 'Complete practice to unlock new words',
  FOCUS_ON_REVIEWS_ONLY: 'Focus on current words first',
  STUDY_WORDS_TO_SEE_PROGRESS: 'Practice words to track progress',
  REVIEW_WORDS_TO_BUILD_MEMORY_STRENGTH: 'Practice to strengthen memory',
  PRACTICE_TO_SEE_LEARNING_SPEED: 'Practice to see learning speed',
  REVIEW_WORDS_TO_TRACK_RETENTION: 'Practice to improve retention',
  REVIEW_WORDS_TO_TRACK_MEMORY_STRENGTH: 'Practice to build memory',
  PRACTICE_TO_SEE_YOUR_LEARNING_SPEED: 'Practice to see your speed',
  STUDY_WORDS_TO_MONITOR_RETENTION: 'Practice to monitor retention',
  START_STUDYING_TO_SEE_PROGRESS: 'Start practicing to see progress',
  PRACTICE_TO_TRACK_LEARNING_SPEED: 'Practice to track speed',
  STUDY_WORDS_TO_TRACK_MEMORY_RETENTION: 'Practice to track retention',

  // Font options
  FONT_MADINA: 'Madina',
  FONT_AMIRI: 'Amiri',
  FONT_SCHEHERAZADE: 'Scheherazade',
  FONT_NASTALIQ: 'Nastaliq',
  FONT_NOTO_SANS: 'Noto Sans',

  // Filter options
  ALL_DIFFICULTIES: 'All difficulties',
  ALL_AUTHORS: 'All authors',

  // Audio fallbacks
  ARABIC_TITLE_FALLBACK: 'Arabic',
  ENGLISH_TITLE_FALLBACK: 'English',
  ENGLISH_FEEDBACK: 'English feedback',
  REVIEW_AUDIO: 'Review audio',

  // Performance indicators
  PERFORMING_EXCELLENTLY: 'Performing excellently',
  PERFORMING_WELL: 'Performing well',
  OUTSTANDING_PERFORMANCE: 'Outstanding performance',
  ROOM_FOR_IMPROVEMENT: 'Room for improvement',
  TRENDING_UPWARD: 'trending upward',
  TRENDING_DOWNWARD: 'trending downward',
  STEADY_PERFORMANCE: 'steady performance',
  ALL_WORDS_RETAINED_WELL: 'all words retained well',
  CONSISTENT_PRACTICE: 'consistent pace',

  // Labels
  ARTICLES_LABEL_SINGULAR: 'article',
  ARTICLES_LABEL_PLURAL: 'articles',
  WORD_OF_LABEL: 'of',
  RECOMMENDED: 'Recommended',
  ACTIVE: 'active',

  // Learning science content
  WHAT_YOU_GET: 'What you get',
  COMMON_CONCERNS: 'Common concerns',
  CLASSICAL_VS_MODERN_ARABIC: 'Classical vs modern Arabic',
  THE_ACQUISITION_PROCESS: 'The acquisition process',
  WHY_CLASSICAL_ISLAMIC_TEXTS: 'Why classical Islamic texts',
  RESEARCH_FOUNDATION: 'Research foundation',
  WHAT_THIS_MEANS: 'What this means',
  SCIENTIFIC_FOUNDATION: 'Scientific foundation',
  RESEARCH_SUPPORT: 'Research support',
  CLASSICAL_ARABIC: 'Classical Arabic',
  MODERN_STANDARD_ARABIC: 'Modern Standard Arabic',
  INPUT_HYPOTHESIS: 'Input hypothesis',
  AFFECTIVE_FILTER_HYPOTHESIS: 'Affective filter hypothesis',
  NATURAL_APPROACH: 'Natural approach',
  TOO_DIFFICULT_WITHOUT_GRAMMAR: '"Too difficult without grammar study"',
  CONTENT_TOO_ADVANCED: '"Content is too advanced"',
  COMPREHENSIBLE_INPUT: 'Comprehensible input (i+1)',
  UNCONSCIOUS_PATTERN_RECOGNITION: 'Unconscious pattern recognition',
  NATURAL_ORDER_ACQUISITION: 'Natural order acquisition',
  INTERNALIZED_COMPETENCE: 'Internalized competence',
  LOW_AFFECTIVE_FILTER: 'Low affective filter',
  RICH_LINGUISTIC_INPUT_TITLE: 'Rich linguistic input',
  OPTIMAL_COMPREHENSIBILITY: 'Optimal comprehensibility',

  // Error messages - actionable with next steps
  ERROR: 'Error',
  UNKNOWN_ERROR_OCCURRED: 'Something unexpected happened',
  SIGN_IN_FAILED: 'Sign in failed',
  ACCOUNT_CREATION_FAILED: 'Account creation failed',
  REFRESH_FAILED: 'Refresh failed',

  // Connection & loading errors - with actionable guidance
  UNABLE_TO_LOAD_ARTICLES: checkConnection,
  FAILED_TO_LOAD_ARTICLES: "Couldn't load articles. " + tryAgain,
  FAILED_TO_LOAD_ARTICLE: "Couldn't load article. " + tryAgain,
  FAILED_TO_LOAD_FILTER_OPTIONS: "Couldn't load filters. " + tryAgain,
  FAILED_TO_LOAD_AUTHORS: "Couldn't load authors. " + tryAgain,
  UNABLE_TO_LOAD_CHART_DATA: "Couldn't load chart. " + tryAgain,

  // Audio errors - with guidance
  FAILED_TO_PREPARE_AUDIO: "Couldn't prepare audio. " + tryAgain,
  FAILED_TO_START_PLAYBACK: "Couldn't start playback. " + tryAgain,
  FAILED_TO_RESTART_AUDIO_PLAYBACK: "Couldn't restart audio. " + tryAgain,
  FAILED_TO_START_AUDIO_PLAYBACK: "Couldn't start audio. " + tryAgain,
  FAILED_TO_LOAD_VOCABULARY_TRACKS: "Couldn't load tracks. " + tryAgain,
  FAILED_TO_GENERATE_AUDIO_TRACK: "Couldn't generate track. " + tryAgain,
  FAILED_TO_GET_ENHANCED_AUDIO_TRACKS: "Couldn't get tracks. " + tryAgain,
  FAILED_TO_GENERATE_VOCABULARY_AUDIO_TRACKS: "Couldn't generate tracks. " + tryAgain,
  FAILED_TO_LOAD_AUDIO_TRACKS: "Couldn't load tracks. " + tryAgain,
  FAILED_TO_INITIALIZE_AUDIO_SESSION: "Couldn't start audio. " + tryAgain,
  FAILED_TO_STOP_AUDIO: "Couldn't stop audio. " + tryAgain,
  FAILED_TO_LOAD_AUDIO: "Couldn't load audio. " + tryAgain,
  FAILED_TO_SKIP_TO_NEXT_TRACK: "Couldn't skip track. " + tryAgain,
  AUDIO_NOT_AVAILABLE_FOR_ARTICLE: 'Audio unavailable for this article',

  // Reading list errors
  FAILED_TO_LOAD_READING_LIST: "Couldn't load playlist. " + tryAgain,
  FAILED_TO_ADD_TO_READING_LIST: "Couldn't save article. " + tryAgain,
  FAILED_TO_REMOVE_FROM_READING_LIST: "Couldn't remove article. " + tryAgain,
  FAILED_TO_CHECK_READING_LIST_STATUS: "Couldn't check save status",

  // Word management errors
  FAILED_TO_REMOVE_WORD_FROM_STUDY: "Couldn't remove word. " + tryAgain,
  FAILED_TO_RESET_WORD_PROGRESS: "Couldn't reset progress. " + tryAgain,
  FAILED_TO_SKIP_WORD_FOR_TODAY: "Couldn't skip word. " + tryAgain,
  FAILED_TO_MARK_WORD_AS_EASY: "Couldn't mark easy. " + tryAgain,
  FAILED_TO_MARK_WORD_AS_HARD: "Couldn't mark hard. " + tryAgain,
  ERROR_UPDATING_STUDY_LIST: "Couldn't update study list. " + tryAgain,

  // Timer errors
  FAILED_TO_START_SLEEP_TIMER: "Couldn't start timer. " + tryAgain,
  FAILED_TO_CANCEL_SLEEP_TIMER: "Couldn't cancel timer. " + tryAgain,

  // Cache errors
  FAILED_TO_CLEAR_AUDIO_CACHE: "Couldn't clear audio cache. " + tryAgain,
  FAILED_TO_CLEAR_OFFLINE_CACHE: "Couldn't clear cache. " + tryAgain,
  FAILED_TO_GET_CACHE_SIZE: "Couldn't check cache size",

  // Auth errors
  FAILED_TO_SIGN_OUT: "Couldn't sign out. " + tryAgain,

  // Sign-in requirements - clearer and shorter
  PLEASE_SIGN_IN_TO_ADD_WORDS: 'Sign in to add words',
  PLEASE_SIGN_IN_TO_ADD_ROOTS: 'Sign in to add roots',

  // Success messages for cache clearing
  AUDIO_CACHE_CLEARED_SUCCESSFULLY: cleared('Audio cache'),
  OFFLINE_DATA_CACHE_CLEARED_SUCCESSFULLY: cleared('Data cache'),
  CACHE_CLEARED_SUCCESSFULLY: cleared('Cache'),

  // Filter validation errors
  INVALID_FILTER_PARAMETERS: 'Invalid filter: type="{type}", id="{id}"',
  INVALID_FILTER_ID: 'Invalid ID: {id}',
  INVALID_FILTER_TYPE: 'Invalid type: "{type}"',

  ERROR_EMPTY_USERNAME: 'Username cannot be empty',
  ERROR_EMPTY_EMAIL: 'Email cannot be empty',
  ERROR_EMPTY_PASSWORD: 'Password cannot be empty',

  // Vocabulary screen messages
  ERROR_PROCESSING_RESULT: 'Unable to process your result',
  ERROR_LOADING_WORD: 'Unable to load next word',
  ERROR_WORD_NOT_FOUND: 'Word could not be found',
  ERROR_REVIEW_RESULTS: 'Unable to fetch review results',
  ERROR_NO_DUE_WORDS: 'No due words to review',
  INSTRUCTIONS_TAP_TO_SEE_MEANING: 'Tap to see meaning',
  VOCABULARY_STATS_TITLE: 'Vocabulary Stats',

  // Delete confirmation modals
  CONFIRM_DELETE_WORD: 'Are you sure you want to delete this word?',
  CONFIRM_DELETE_SELECTED: 'Delete selected words?',
  DELETE_FOREVER_WARNING: 'This action cannot be undone.',
} as const;

export type StringKey = keyof typeof STRINGS;
