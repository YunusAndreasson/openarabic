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
  THEME: 'Theme',
  DARK_MODE: 'Dark mode',
  ARABIC_FONT: 'Arabic font',
  AUDIO_LANGUAGE: 'Audio language',
  AUDIO_LANGUAGE_ARABIC: 'Arabic only',
  AUDIO_LANGUAGE_BILINGUAL: 'English + Arabic',

  // Content states
  LOADING_PLAYLIST: 'Loading playlist',

  SOMETHING_WENT_WRONG: 'Something went wrong',
  PLEASE_TRY_AGAIN: tryAgain,
  LOADING: 'Loading',
  LOADING_ARTICLES: 'Loading articles',
  LOADING_CHART: 'Loading chart',
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
  AUTHOR_FILTER: 'Author',
  RESUMED_READING_TEMPLATE: 'Resumed at {percent}%',

  // Practice state labels
  WORD_OPTIONS: 'Word options',
  UNKNOWN: 'Unknown',
  UNSURE: 'Unsure',
  KNOWN: 'Known',
  NO_TRANSLATION_AVAILABLE: 'No translation available',

  // Article & content actions - shortened and action-oriented
  BROWSE_ARTICLES: 'Browse articles',
  ARTICLES_SELECTED_FOR_YOU: 'Articles selected for you',
  SUMMARY: 'Summary',
  READ: 'Library',
  LISTEN: 'Playlist',
  PRACTICE: 'Study',
  STUDY_DUE_WORDS: 'Review Now',

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
  NO_ARTICLES_FOUND: 'No matches found',
  NO_MATCHES_FOUND: 'No matches found',
  TRY_DIFFERENT_SEARCH: 'Try a different search term or check spelling',
  NO_ARTICLES_SAVED: 'No saved articles',
  LISTENING_PLAYLIST_EMPTY: 'Add articles to build your playlist',

  // Listen tab empty state - user-centric and playlist-focused
  PLAYLIST_EMPTY_TITLE: 'Your playlist is empty',
  PLAYLIST_EMPTY_DESCRIPTION: 'Save content from Library to start listening',

  // Practice tab empty state - user-centric and study-focused
  STUDY_LIST_EMPTY_TITLE: 'No words to study',
  STUDY_LIST_EMPTY_DESCRIPTION: 'Add words from articles to start studying',

  // Dictionary
  DICTIONARY: 'Dictionary',
  NO_STUDY_WORDS: 'No study words',
  ADD_WORDS_TO_STUDY_LIST: 'Add words to your study list to see them here',
  SEARCH_WORDS_PLACEHOLDER: 'Search words...',

  PROGRESS_NOT_AVAILABLE: "Progress isn't available right now",
  ERROR_LOADING_DATA: "Couldn't load data",

  // Success messages - encouraging and celebration-focused
  SESSION_COMPLETE: 'Session complete!',
  ALL_WORDS_PRACTICED: 'Great work on your study session',
  ADDED_TO_LISTENING_LIST: 'Saved to playlist',
  REMOVED_FROM_LISTENING_LIST: 'Removed from playlist',

  ACCOUNT_CREATED: 'Account created',
  CHECK_EMAIL_CONFIRMATION: 'Check your email for confirmation',
  SUCCESS: 'Success',
  NEW_RECOMMENDATION_SELECTED: 'New recommendation selected',
  SELECTED_TO_HELP_PRACTICE_DUE: 'Selected to help study due words',
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
    'At least {minLength} characters with uppercase, lowercase, and a number',
  ARE_YOU_SURE_SIGN_OUT: 'Sign out?',
  ENTER_VALID_EMAIL: 'Enter a valid email',
  ENTER_PASSWORD: 'Enter your password',
  PASSWORD_ADD_CHARACTER_TYPES: 'Add uppercase, lowercase and a number',
  PASSWORD_USE_AT_LEAST_TEMPLATE: 'Use at least {minLength} characters',

  // Word management actions - shortened
  SKIP_TODAY: 'Skip today',
  HIDE_FROM_CURRENT_SESSION: 'Hide this session',
  RESET_PROGRESS: 'Reset progress',
  START_OVER_WITH_THIS_WORD: 'Start over',
  STOP_STUDYING: 'Stop studying',
  REMOVE_FROM_VOCABULARY_LIST: 'Remove from list',
  MAKE_EASIER: 'Reduce difficulty',
  REDUCE_DIFFICULTY_LEVEL: 'Reduce difficulty',
  NEEDS_PRACTICE: 'Needs study',
  SHOW_MORE_OFTEN: 'Show more',
  MARK_EASY: 'Mark easy',
  SHOW_LESS_OFTEN: 'Show less',
  MARK_HARD: 'Mark hard',

  // Practice session labels - concise and scientifically grounded
  // 3-Phase FSRS Practice System - scientifically grounded labels
  URGENT_PRESERVATION: 'Review due words', // RED PHASE: Clear action verb + object
  NO_WORDS_TO_STUDY: 'No words to study',

  // Insights & analytics
  INSIGHTS: 'Insights',
  PROGRESS: 'Progress',
  MEMORY_STRENGTH: 'Memory strength',
  MEMORY_STRENGTH_EXPLANATION_TITLE: 'Memory strength',
  MEMORY_STRENGTH_EXPLANATION:
    'Memory strength shows how many words you still remember. At 100%, you remember all your vocabulary.',
  MEMORY_STRENGTH_TIP: 'Add new words when strength is high',
  STRENGTH_SCORE: 'Memory strength',
  DUE_WORDS: 'Due',
  STRUGGLING_WORDS: 'Struggling',
  RED_PHASE: 'Preserve memory',
  ORANGE_PHASE: 'Consolidate',
  GREEN_PHASE: 'Ready to add',
  PHASE_RECOMMENDATION_RED: 'Your review load is high. Clear due reviews before adding new words.',
  PHASE_RECOMMENDATION_ORANGE:
    'Some words need consolidation. Strengthen them first; add a few only if reviews stay steady.',
  PHASE_RECOMMENDATION_GREEN:
    "Your load is balanced. It's a good time to add new words while keeping up daily reviews.",

  INSIGHTS_UNAVAILABLE: 'Insights unavailable',
  INFO: 'Info',
  MEMORY_STRENGTH_INFO: 'About memory strength',

  WORD_MASTERY: 'Word mastery',
  LEARNING_PROGRESS: 'Learning progress',
  REVIEW_TIMING: 'Memory strength',
  REVIEW_TIMING_EXPLANATION:
    'Reviews are scheduled when recall drops. Clearing due words restores memory strength; consolidating weak words moves you toward green.',
  MEMORY_STRENGTH_OPTIMAL_TIMING: 'Optimal timing for reviews based on your memory strength',
  // Memory strength labels - simple strength indicators (sentence case)
  MEMORY_STRENGTH_LOW: 'Low memory strength',
  MEMORY_STRENGTH_MEDIUM: 'Medium memory strength',
  MEMORY_STRENGTH_HIGH: 'High memory strength',
  MEMORY_STRENGTH_CHARTS_DESCRIPTION:
    'These charts show detailed stats about your memory strength and learning progress. Use them to understand how your vocabulary retention works and track improvement over time.',
  DUE_TODAY_LABEL: 'Due words today: {count}',
  STRUGGLING_COUNT_LABEL: 'Struggling words: {count}',
  DUE_FEW_RECOMMENDATION: 'You have a few reviews due. Clear them before adding new words.',
  DUE_SEVERAL_RECOMMENDATION: 'You have several reviews due. Clear them before adding new words.',
  MEMORY_STRENGTH_ACROSS_VOCABULARY:
    'Vocabulary knowledge strength, showing how much you have mastered.',
  VOCABULARY_ACQUISITION_VELOCITY:
    'Daily vocabulary advancement, tracking new words mastered over time.',
  MEMORY_RETENTION_OPTIMAL_TIMING:
    'Optimal review scheduling, indicating daily recall to guide retention.',
  DUE_WORDS_FORECAST: 'Due words forecast',
  DUE_WORDS_FORECAST_EXPLANATION:
    'Projected due words over the next 7 days, helping you plan study sessions and manage review workload.',

  // Memory retention modal
  MEMORY_RETENTION_EXPLANATION:
    'Memory strength shows how many words you still remember. At 100%, you remember all your vocabulary.',
  MEMORY_RETENTION_TIP:
    'Stay above the {threshold}% threshold line. Practice existing words before adding new ones.',

  // Account
  ACCOUNT: 'Account',
  HELP: 'Help',
  CONTACT_SUPPORT: 'Contact support',
  SUPPORT_EMAIL: 'yunus@edenmind.com',
  SUPPORT_EMAIL_SUBJECT: 'Open Arabic App Support',
  SUPPORT_EMAIL_BODY_TEMPLATE:
    'Hi there,\n\nI need help with the Open Arabic app.\n\nApp Version: {version}\nUser Email: {email}\n\nPlease describe your issue below:\n',
  LANGUAGE_LEARNING_SCIENCE: 'Learning science',
  WHY_CLASSICAL_TEXTS: 'Why classical texts',
  CLASSICAL_TEXTS: 'Classical texts',
  LEARNING_METHOD: 'Learning method',
  APP_VERSION_LABEL: 'Version',
  COPYRIGHT_SYMBOL: '\u00A9',
  NO_EMAIL: 'No email',
  BYTE_UNITS: ['Bytes', 'KB', 'MB', 'GB'] as const,
  ERROR_ASYNC_STORAGE_UNAVAILABLE: 'AsyncStorage unavailable, persistence disabled',
  ERROR_ASYNC_STORAGE_CANNOT_CLEAR: 'AsyncStorage unavailable, cannot clear cache',
  ERROR_ASYNC_STORAGE_CANNOT_READ: 'AsyncStorage unavailable, cannot read cache',
  ERROR_PRIORITY_QUEUE_LENGTH_MISMATCH: 'Items and priorities arrays must have the same length',

  // Cache management - clearer and more actionable
  CLEAR_CACHE: 'Local cache',
  NO_CACHE: 'No cache',
  NO_CACHED_FILES: 'No cached files',
  THIS_WILL_DELETE: 'This deletes',
  AUDIO_REDOWNLOAD_REQUIRED: 'Audio will re-download when needed',
  DATA_RELOAD_REQUIRED: 'Data will reload when needed',

  // Notifications
  ENABLE_NOTIFICATIONS: 'Enable notifications',
  TURN_ON_NOTIFICATIONS: 'Get daily study reminders',
  OPEN_SETTINGS: 'Open Settings',
  NOTIFICATIONS_DISABLED: 'Notifications disabled',
  NOTIFICATION_REMINDER_TITLE: 'Time to study Arabic!',
  NOTIFICATION_REMINDER_BODY: 'Continue your Arabic learning journey',

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
  ADD_WORDS_TO_SEE_CAPACITY: 'Browse articles in the Library tab to add words',

  STUDY_WORDS_TO_SEE_PROGRESS: 'Study words to track progress',
  REVIEW_WORDS_TO_BUILD_MEMORY_STRENGTH: 'Study to strengthen memory',
  PRACTICE_TO_SEE_LEARNING_SPEED: 'Study to see learning speed',
  START_REVIEWING_TO_BUILD_STRENGTH: 'Study some words to see memory strength',
  START_PRACTICING_TO_SEE_SPEED: 'Study some words to see your learning speed',
  REVIEW_WORDS_TO_TRACK_RETENTION: 'Study to improve retention',
  STUDY_TO_MONITOR_REVIEW_TIMING: 'Study some words to see review schedule',
  REVIEW_WORDS_TO_TRACK_MEMORY_STRENGTH: 'Study to build memory',
  PRACTICE_TO_SEE_YOUR_LEARNING_SPEED: 'Study to see your speed',
  STUDY_WORDS_TO_MONITOR_RETENTION: 'Study to monitor retention',
  START_STUDYING_TO_SEE_PROGRESS: 'Start studying to see progress',
  PRACTICE_TO_TRACK_LEARNING_SPEED: 'Study to track speed',
  STUDY_WORDS_TO_TRACK_MEMORY_RETENTION: 'Study to track retention',

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
  ALL_WORDS_LOOK_STABLE: 'All words look stable',
  CONSISTENT_PRACTICE: 'consistent pace',
  ON_TRACK_WITH_USUAL_SPEED: 'On track with your usual speed',
  FASTER_THAN_USUAL: 'Faster than usual',
  SLOWER_THAN_USUAL: 'Slower than usual',

  // Labels
  ARTICLES_LABEL_SINGULAR: 'article',
  ARTICLES_LABEL_PLURAL: 'articles',
  WORD_OF_LABEL: 'of',
  BY: 'by',
  RECOMMENDED: 'Recommended',
  CONTINUE_READING: 'Continue reading',
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
  UNKNOWN_ERROR_OCCURRED: 'Something went wrong',
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
  FAILED_TO_GENERATE_AUDIO_TRACK: "Couldn't generate track. " + tryAgain,
  FAILED_TO_GET_ENHANCED_AUDIO_TRACKS: "Couldn't get tracks. " + tryAgain,
  FAILED_TO_LOAD_AUDIO_TRACKS: "Couldn't load audio tracks. " + tryAgain,
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
  NO_PRACTICE_NEEDED: 'All caught up. Add new words to continue learning',
  GET_STARTED_MESSAGE: 'Browse articles in the Library tab to add words you want to learn',
  PRACTICE_OPTIONS: 'Study options',

  // Vocabulary stat card labels and messages
  VOCAB_STAT_DUE: 'Due',
  VOCAB_STAT_LEARNING: 'Learning',
  VOCAB_STAT_MASTERED: 'Mastered',

  // Learning method content
  LEARNING_METHOD_INTRO:
    "Language acquisition occurs through understanding bilingual sentences, not grammar instruction. According to Krashen's Input Hypothesis, the brain naturally identifies patterns through exposure to comprehensible input.",
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
    "Krashen's Input Hypothesis demonstrates that comprehensible input is the primary mechanism for language acquisition. Research shows optimal learning occurs when learners understand 90-95% of content.",
  LANGUAGE_DEVELOPS_THROUGH_UNDERSTANDING:
    'Language develops through understanding, not memorization',
  UNDERSTANDING_MESSAGES_DRIVES_DEVELOPMENT: 'Understanding sentences drives language development',
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
    "Translations provide comprehensible input while exposing you to authentic structures. Krashen's research shows grammar is acquired, not learned.",
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
  MEMORY_STRENGTH_BOOST_TEMPLATE: '+{days} days memory strength boost',
  WORDS_PER_MIN_TEMPLATE: '{rate} words/min - efficient learning',
  WORDS_REVIEWED_DEDICATION_TEMPLATE: '{count} words reviewed - dedication pays off',
  WORDS_REVIEWED_GREAT_TEMPLATE: '{count} words reviewed - great effort',

  // Efficiency (units)
  WORDS_PER_DAY: 'words/day',
  WORDS_PER_DAY_SHORT: 'words/day',
  LAST_7_DAYS_AVG: 'avg {value}/day (last 7 days)',

  // Chart summary labels
  LATEST: 'Latest',
  AVERAGE: 'Average',
  MAX: 'Max',

  // Insights screen explanation
  INSIGHTS_EXPLANATION:
    'These charts show detailed stats about your memory strength and learning progress. Use them to understand how your vocabulary retention works and track improvement over time.',

  // Chart scale captions (concise, intuitive mappings)
  SCALE: 'Scale',
  SCALE_WEAK_TO_STRONG: 'Weak → Strong',
  SCALE_SLOW_TO_FAST: 'Slow → Fast',
  SCALE_DUE_NOW_TO_SAFE: 'Due now → Safe',

  // Help content
  HELP_GETTING_STARTED: 'Getting Started',
  HELP_ACCOUNT_SETTINGS: 'Account',
  HELP_TROUBLESHOOTING: 'Troubleshooting',

  // FAQ Questions and Answers
  FAQ_HOW_TO_ADD_WORDS_Q: 'How do I add words to study?',
  FAQ_HOW_TO_ADD_WORDS_A:
    'Browse articles in the Library tab and tap on any Arabic word to add it to your vocabulary list. The app uses spaced repetition to help you learn effectively.',

  FAQ_HOW_SPACED_REPETITION_WORKS_Q: 'How does spaced repetition work?',
  FAQ_HOW_SPACED_REPETITION_WORKS_A:
    "The app shows you words just before you're likely to forget them. Words you find easy appear less often, while challenging words appear more frequently until you master them.",

  FAQ_READ_VS_LISTEN_Q: "What's the difference between Library and Playlist?",
  FAQ_READ_VS_LISTEN_A:
    'Library lets you browse articles and add vocabulary. Playlist plays saved articles so you can listen while multitasking.',

  FAQ_CHANGE_STUDY_REMINDERS_Q: 'How do I change my study reminders?',
  FAQ_CHANGE_STUDY_REMINDERS_A:
    "Go to Account, toggle study reminders on, then tap Time to set when you'd like to be reminded to practice.",

  FAQ_CHANGE_THEMES_Q: 'How do I change themes?',
  FAQ_CHANGE_THEMES_A:
    'In Account, tap Theme to choose from different color schemes that match your preference and environment.',

  FAQ_AUDIO_NOT_PLAYING_Q: "Why isn't audio playing?",
  FAQ_AUDIO_NOT_PLAYING_A:
    'Check your device volume and ensure you have a good internet connection. Audio files download automatically when you first play them.',

  FAQ_SLEEP_TIMER_Q: 'How do sleep timers work?',
  FAQ_SLEEP_TIMER_A:
    'While listening, tap the timer button to set how long audio should play before automatically stopping. Perfect for bedtime listening.',

  FAQ_PRACTICE_OFFLINE_Q: 'Can I practice without internet?',
  FAQ_PRACTICE_OFFLINE_A:
    "Yes! Once you've added words and they've synced, you can study vocabulary anywhere. Audio requires internet for first-time downloads.",
} as const;

export type StringKey = keyof typeof STRINGS;
