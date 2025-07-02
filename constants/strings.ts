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
  MANAGE: 'Manage',
  CLOSE: 'Close',
  BACK: 'Back',
  CANCEL: 'Cancel',
  CLEAR: 'Clear',
  CONTINUE: 'Continue',

  // Sorting options
  DATE_ADDED: 'Date',
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
  READ: 'Library',
  LISTEN: 'Playlist',
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

  PROGRESS_NOT_AVAILABLE: "Progress isn't available right now",
  ERROR_LOADING_DATA: "Couldn't load data",

  // Success messages - encouraging and celebration-focused
  SESSION_COMPLETE: 'Session complete!',
  ALL_WORDS_PRACTICED: 'Great work on your practice session',
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
  ENTER_VALID_EMAIL: 'Enter a valid email',
  ENTER_PASSWORD: 'Enter your password',
  PASSWORD_ADD_CHARACTER_TYPES: 'Add uppercase, lowercase and number',
  PASSWORD_USE_AT_LEAST_TEMPLATE: 'Use at least {minLength} characters',

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

  // Practice session labels - concise and scientifically grounded
  // 3-Phase FSRS Practice System - scientifically grounded labels
  URGENT_PRESERVATION: 'Review due words', // RED PHASE: Clear action verb + object
  EFFORTFUL_RETRIEVAL: 'Practice struggling words', // YELLOW PHASE: Clear action verb + object
  INTERLEAVED_REVIEW: 'Study all words', // GREEN PHASE: Clear action verb + object

  // Practice button descriptions - streamlined and action-oriented
  URGENT_MEMORY_PRESERVATION: 'Restore memory capacity from fading words', // Clear capacity improvement
  EFFORTFUL_RETRIEVAL_PRACTICE: 'Strengthen memory capacity from weak spots', // Clear capacity building
  INTERLEAVED_REVIEW_DESCRIPTION: 'Maximize memory capacity for new words', // Clear capacity optimization

  // Insights & analytics
  INSIGHTS: 'Insights',
  MEMORY_CAPACITY: 'Memory Capacity',
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
  SUPPORT_EMAIL: 'yunus@edenmind.com',
  SUPPORT_EMAIL_SUBJECT: 'Open Arabic App Support',
  SUPPORT_EMAIL_BODY_TEMPLATE:
    'Hi there,\n\nI need help with the Open Arabic app.\n\nApp Version: {version}\nUser Email: {email}\n\nPlease describe your issue below:\n',
  LANGUAGE_LEARNING_SCIENCE: 'Learning science',
  WHY_CLASSICAL_TEXTS: 'Why classical texts',
  CLASSICAL_TEXTS: 'Classical texts',
  LEARNING_METHOD: 'Learning method',
  TWITTER: 'Twitter',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  APP_VERSION_LABEL: 'Version',
  COPYRIGHT_SYMBOL: '\u00A9',
  NO_EMAIL: 'No email',
  BYTE_UNITS: ['Bytes', 'KB', 'MB', 'GB'] as const,
  ERROR_ASYNC_STORAGE_UNAVAILABLE: 'AsyncStorage unavailable, persistence disabled',
  ERROR_ASYNC_STORAGE_CANNOT_CLEAR: 'AsyncStorage unavailable, cannot clear cache',
  ERROR_ASYNC_STORAGE_CANNOT_READ: 'AsyncStorage unavailable, cannot read cache',
  ERROR_PRIORITY_QUEUE_LENGTH_MISMATCH: 'Items and priorities arrays must have the same length',

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
  TOMORROW: 'Tomorrow',
  YESTERDAY: 'Yesterday',
  AM: 'AM',
  PM: 'PM',
  PAST: 'Past',
  DAYS_AGO_TEMPLATE: '{days} days ago',
  IN_DAYS_TEMPLATE: 'In {days} days',
  IN_WEEKS_TEMPLATE: 'In {weeks} weeks',
  IN_MONTHS_TEMPLATE: 'In {months} months',
  IN_YEARS_TEMPLATE: 'In {years} years',
  ALL_TIME: 'All time',
  PAST_WEEK: 'Past week',
  PAST_MONTH: 'Past month',
  DATE_VARIANCE_NOTE: 'Dates may vary by 1-2 days depending on moon sighting',
  AH: 'AH',
  DAY_OF_TEMPLATE: 'Day {day} of {duration}',

  // Learning capacity & guidance - more actionable
  ADD_WORDS_TO_SEE_CAPACITY: 'Add words from articles to start learning',

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
  FONT_MADINA_DESCRIPTION: 'Modern & clean',
  FONT_AMIRI_DESCRIPTION: 'Traditional',
  FONT_SCHEHERAZADE_DESCRIPTION: 'Flowing',
  FONT_NASTALIQ_DESCRIPTION: 'Calligraphic',
  FONT_NOTO_SANS_DESCRIPTION: 'Simple',

  // Filter options
  ALL_DIFFICULTIES: 'All difficulties',
  ALL_AUTHORS: 'All authors',
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',

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
  BY: 'by',
  RECOMMENDED: 'Recommended',
  ACTIVE: 'active',

  // Learning science content - Remove redundant section titles (benefits, concerns, research are obvious from content)
  CLASSICAL_VS_MODERN_ARABIC: 'Classical vs modern Arabic',
  THE_ACQUISITION_PROCESS: 'The acquisition process',
  WHY_CLASSICAL_ISLAMIC_TEXTS: 'Why classical Islamic texts',
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
  FAILED_TO_LOAD_AUDIO_TRACKS: 'Failed to load audio tracks',
  FAILED_TO_INITIALIZE_AUDIO_SESSION: "Couldn't start audio. " + tryAgain,
  FAILED_TO_STOP_AUDIO: "Couldn't stop audio. " + tryAgain,
  FAILED_TO_LOAD_AUDIO: "Couldn't load audio. " + tryAgain,
  FAILED_TO_SKIP_TO_NEXT_TRACK: "Couldn't skip track. " + tryAgain,

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
  ERROR_PROCESSING_RESULT: "Couldn't process result. " + tryAgain,
  ERROR_LOADING_WORD: "Couldn't load word. " + tryAgain,
  ERROR_WORD_NOT_FOUND: "Couldn't find word. " + tryAgain,
  ERROR_REVIEW_RESULTS: "Couldn't load results. " + tryAgain,
  ERROR_NO_DUE_WORDS: 'No due words to review',
  INSTRUCTIONS_TAP_TO_SEE_MEANING: 'Tap to see meaning',

  // Delete confirmation modals
  CONFIRM_DELETE_WORD: 'Are you sure you want to delete this word?',
  CONFIRM_DELETE_SELECTED: 'Delete selected words?',
  DELETE_FOREVER_WARNING: 'This action cannot be undone.',

  // Vocabulary readiness - simplified 3-phase system aligned with copy guidelines
  READY_TO_ADD: 'Add new words',
  PRACTICE_MORE_FIRST: 'Build capacity',
  FOCUS_ON_CURRENT: 'Preserve memory',

  // Practice button disabled messages - concise guidance
  COMPLETE_DUE_FIRST: 'Review due words first',
  FOCUS_ON_STRUGGLING_FIRST: 'Strengthen struggling words first',
  NO_PRACTICE_NEEDED: 'All caught up! Add new words to continue learning',
  GET_STARTED_MESSAGE: 'Start by reading articles and adding words you want to learn',
  PRACTICE_OPTIONS: 'Practice options',

  // Learning method content
  LEARNING_METHOD_INTRO:
    'Language acquisition occurs through understanding meaningful messages, not grammar instruction. According to Krashens Input Hypothesis, the brain naturally identifies patterns through exposure to comprehensible input.',
  TRANSLATIONS_EXPOSE_STRUCTURES:
    'Translations provide meaning context while exposing you to Arabic structures just beyond your current level.',
  BRAIN_AUTOMATICALLY_IDENTIFIES:
    'The brain automatically identifies recurring structures without conscious analysis or grammar study.',
  STRUCTURES_ACQUIRED_PREDICTABLE:
    'Language structures are acquired in a predictable sequence through repeated meaningful exposure.',
  INTERNALIZED_COMPETENCE_DESC:
    'Arabic structures become part of your acquired language system, enabling fluent use.',
  PERSONAL_INTEREST_REDUCES_ANXIETY:
    'Personal interest in content reduces anxiety and increases motivation, enabling optimal acquisition.',
  COMPLETE_ARABIC_SYSTEM:
    'Complete Arabic grammatical system and extensive vocabulary in authentic, meaningful contexts.',
  FAMILIAR_CONCEPTS_CREATE_I_PLUS_ONE:
    'Familiar concepts in Arabic with translation support create ideal i+1 conditions for acquisition.',
  KRASHEN_INPUT_HYPOTHESIS:
    'Krashens Input Hypothesis demonstrates that comprehensible input is the primary mechanism for language acquisition. Research shows optimal learning occurs when learners understand 90-95% of content.',
  LANGUAGE_DEVELOPS_THROUGH_UNDERSTANDING:
    'Language develops through understanding, not memorization',
  UNDERSTANDING_MESSAGES_DRIVES_DEVELOPMENT: 'Understanding messages drives language development',
  ACQUISITION_OCCURS_AUTOMATICALLY:
    'Acquisition occurs automatically with sufficient comprehensible input',
  RESEARCH_REF_KRASHEN_1985:
    'The Input Hypothesis: Issues and Implications. Demonstrates that comprehensible input is the primary driver of language acquisition.',
  RESEARCH_REF_KRASHEN_TERRELL_1983:
    'The Natural Approach. Demonstrates effective language teaching through comprehensible input and meaningful content.',
  RESEARCH_REF_LIGHTBOWN_SPADA_2013:
    'How Languages are Learned. Highlights key findings on effective acquisition techniques.',
  RESEARCH_REF_AFFECTIVE_FILTER_HYPOTHESIS:
    'Principles and Practice in Second Language Acquisition. Shows how motivation and low anxiety enable optimal language acquisition.',
  REFERENCE_KRASHEN_1985: 'Krashen, S. (1985)',
  REFERENCE_KRASHEN_TERRELL_1983: 'Krashen, S. & Terrell, T. (1983)',
  REFERENCE_KRASHEN_1982: 'Krashen, S. (1982)',
  REFERENCE_LIGHTBOWN_SPADA_2013: 'Lightbown, P. & Spada, N. (2013)',

  // Classical texts content
  CLASSICAL_TEXTS_INTRO:
    'Classical Islamic texts with translations provide optimal conditions for Arabic acquisition through comprehensible input.',
  TRANSLATIONS_PROVIDE_COMPREHENSION:
    'Translations provide comprehensible input while exposing you to authentic structures. Krashens research shows grammar is acquired, not learned.',
  RICH_VOCABULARY_INPUT_DESC: 'Thousands of words in meaningful, comprehensible contexts',
  AUTHENTIC_LANGUAGE_PATTERNS_DESC: 'Arabic as actually written and used by native speakers',
  PERSONAL_INTEREST_LOWERS_AFFECTIVE_FILTER:
    'Personal interest lowers the affective filter and improves acquisition. Familiar concepts create optimal i+1 conditions.',
  CULTURAL_AND_CONCEPTUAL_FRAMEWORK_DESC: 'Understanding of Arabic thought patterns and expression',
  CLASSICAL_ARABIC_DESC:
    'Foundation of all Arabic varieties. Enables reading Quran, hadith, literature, formal writing, and news.',
  MODERN_STANDARD_ARABIC_DESC:
    'Simplified classical Arabic for contemporary media and formal contexts. Easy transition from classical foundation.',
  PROCESS_EXPOSURE_BUILDS_COMPETENCE:
    'Consistent exposure to comprehensible input builds linguistic competence over time. Each reading session contributes to your developing Arabic system through unconscious acquisition.',
  APPROACH_VALIDATED_BY_RESEARCH:
    'This approach has successfully taught Arabic for centuries. Modern SLA research validates combining authentic texts with translation support for optimal comprehensible input.',

  // Info modal tips
  INFO_TIP_CLIMBS: 'Steep climbs show breakthrough learning – celebrate these moments',
  INFO_TIP_PLATEAUS: 'Plateaus are natural consolidation periods – stay consistent',
  INFO_TIP_CONTEXT: 'Focus on understanding words in context, not isolated memorization',
  INFO_TIP_STRONG_WORDS: 'Strong words are permanent additions to your language ability',
  INFO_TIP_REVIEW_BEFORE_FORGETTING: 'Review just before forgetting for strongest memory formation',
  INFO_TIP_GREEN_ZONES: 'Green zones (85%+) indicate good time for adding new words',
  INFO_TIP_YELLOW_RED_ZONES: 'Yellow/red zones need immediate review to prevent memory loss',
  INFO_TIP_CONSISTENT_PRACTICE: 'Consistent practice prevents steep drops in retention',
  INFO_TIP_STUDY_FRESH: 'Study when mentally fresh for better memory encoding',
  INFO_TIP_CONNECT_WORDS: 'Connect new words to existing knowledge for stronger networks',
  INFO_TIP_FOCUS_CONTEXT: 'Focus on understanding context, not just memorizing definitions',
  INFO_TIP_DAILY_PRACTICE: 'Consistent daily practice beats intensive cramming sessions',

  // Audio player errors
  ERROR_SELECTED_TRACK_NO_URL: 'Selected track has no audio URL',
  ERROR_SELECTED_TRACK_NOT_FOUND: 'Selected track not found',
  ERROR_FAILED_PROCESS_FIRST_TRACK: 'Failed to process first track',

  // Encouraging metrics templates
  ACCURACY_EXCELLENT_TEMPLATE: '{percent}% accuracy - excellent recall',
  ACCURACY_SOLID_TEMPLATE: '{percent}% accuracy - solid progress',
  WORDS_STRONG_SESSION_TEMPLATE: '{count} words strong this session',
  STREAK_EXCELLENT_TEMPLATE: '{count}-word streak - excellent focus',
  STREAK_ACHIEVED_TEMPLATE: '{count}-word streak achieved',
  MASTERED_WORDS_TEMPLATE: '{count} words reached strong level',
  MEMORY_STRENGTH_BOOST_TEMPLATE: '+{days} days average memory strength boost',
  WORDS_PER_MIN_TEMPLATE: '{rate} words/min - efficient learning',
  WORDS_REVIEWED_DEDICATION_TEMPLATE: '{count} words reviewed - dedication pays off',
  WORDS_REVIEWED_GREAT_TEMPLATE: '{count} words reviewed - great effort',

  // Memory Capacity Labels - Simple capacity indicators
  MEMORY_CAPACITY_LOW: 'Low Memory Capacity',
  MEMORY_CAPACITY_MEDIUM: 'Medium Memory Capacity',
  MEMORY_CAPACITY_HIGH: 'High Memory Capacity',

  // Insights screen explanation
  INSIGHTS_EXPLANATION:
    'These charts show detailed stats about your memory capacity and learning progress. Use them to understand how your vocabulary retention works and track improvement over time.',
} as const;

export type StringKey = keyof typeof STRINGS;
