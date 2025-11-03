// Helper functions for consistent messaging
const tryAgain = 'Try again';
const checkConnection = 'Check connection and try again';
const cleared = (item: string) => `${item} cleared`;

export const STRINGS = {
  // Settings & preferences
  STUDY_REMINDERS: 'Study reminders',
  TIME: 'Time',
  THEME: 'Theme',
  DARK_MODE: 'Dark mode',
  ARABIC_FONT: 'Arabic font',
  AUDIO_LANGUAGE: 'Audio language',
  AUDIO_LANGUAGE_ARABIC: 'Arabic only',
  AUDIO_LANGUAGE_BILINGUAL: 'English + Arabic',
  AUDIO_SHUFFLE: 'Shuffle audio',
  AUDIO_SHUFFLE_DESCRIPTION: 'Plays articles in random order in the Bookmarks tab',
  DISPLAY_LANGUAGE: 'Display language',
  DISPLAY_LANGUAGE_ARABIC: 'Arabic only',
  DISPLAY_LANGUAGE_BILINGUAL: 'Arabic + English',
  DAILY_WORD_LIMIT: 'Daily word limit',
  DAILY_WORD_LIMIT_DESCRIPTION: 'Maximum number of words per day',

  // Account section titles - now imported directly from enums in components
  ACCOUNT: 'Account',
  APPEARANCE_SECTION: 'Appearance',
  DATA_ACCOUNT_SECTION: 'Account',

  // Social Media
  TWITTER_URL: 'https://x.com/openarabicio',
  INSTAGRAM_URL: 'https://www.instagram.com/openarabic.io/',
  FACEBOOK_URL: 'https://www.facebook.com/OpenArabic.io/',

  // App Store Review
  RATE_APP: 'Rate OpenArabic',

  // Theme names
  THEME_BIRCHES: 'Birches in Spring',
  THEME_MIDNIGHT: 'Midnight Summer',
  THEME_AUTUMN: 'Autumn Leaves',

  // Content states
  LOADING_BOOKMARKS: 'Loading bookmarks',

  SOMETHING_WENT_WRONG: 'Something went wrong',
  PLEASE_TRY_AGAIN: tryAgain,
  LOADING: 'Loading',
  LOADING_ARTICLES: 'Loading articles',
  LOADING_CHART: 'Loading chart',
  PREPARING_AUDIO: 'Preparing audio',
  LOADING_AUDIO_ELLIPSIS: 'Loading session...',
  AUDIO_READY: 'Audio ready',
  PREPARING_PRACTICE_SESSION: 'Preparing practice session...',

  // Timer controls
  STOP_TIMER: 'Stop timer',
  TIME_REMAINING: 'Time remaining',

  // Welcome & onboarding
  WELCOME_TITLE: 'Welcome to OpenArabic',
  WELCOME_SUBTITLE: 'Sign in to continue learning Arabic',
  WELCOME_SUBTITLE_CREATE: 'Create an account to start learning Arabic',

  // Sign In screen
  SIGN_IN_TITLE: 'Sign in to OpenArabic',
  SIGN_IN_SUBTITLE: 'Welcome back! Continue your Arabic learning journey.',

  // Sign Up screen
  CREATE_ACCOUNT_TITLE: 'Create your account',
  CREATE_ACCOUNT_SUBTITLE: 'Start your journey to mastering Arabic.',

  // Landing screen
  CONTINUE_WITH_EMAIL_OPTION: 'Continue with email',
  HIDE_EMAIL_OPTIONS: 'Hide email options',

  // Navigation & controls - now imported directly from enums in components
  AUTHORS: 'Authors',
  AUTHOR_ARTICLES: 'Author Articles',
  DIFFICULTY: 'Difficulty',
  CATEGORY: 'Category',

  RESUMED_READING_TEMPLATE: 'Resumed at {percent}%',

  // Practice state labels
  WORD_OPTIONS: 'Word options',
  NO_TRANSLATION_AVAILABLE: 'No translation available',

  // Article & content actions - shortened and action-oriented
  BROWSE_ARTICLES: 'Browse articles',
  ARTICLES_SELECTED_FOR_YOU: 'Articles selected for you',
  SUMMARY: 'Summary',
  LATEST_READ: 'Latest Read',

  // Audio controls - shortened button text
  STOP: 'Stop',
  REMOVE: 'Remove',
  SLEEP_TIMER_TITLE: 'Sleep timer',
  SLEEP_TIMER_AUTOMATIC: 'Playback stops automatically',
  SLEEP_TIMER_CHOOSE_WHEN: 'Choose when to stop',
  TIMER: 'Timer',
  SET_TIME: 'Set time',
  REMAINING: 'remaining',
  MINUTES: '{minutes} min',

  // Empty states & hints - more actionable
  TRY_ADJUSTING_FILTERS: 'Try different filters',
  NO_ARTICLES_FOUND: 'No matches found',
  TRY_DIFFERENT_SEARCH: 'Try a different search term or check spelling',
  NO_ARTICLES_SAVED: 'No saved articles',
  LISTENING_BOOKMARKS_EMPTY: 'Add articles to build your bookmarks',

  // Listen tab empty state - user-centric and bookmarks-focused
  BOOKMARKS_EMPTY_TITLE: 'Build your audio library',
  BOOKMARKS_EMPTY_DESCRIPTION:
    'Bookmark articles while reading to listen anytime. Tap the bookmark icon in any article.',
  BOOKMARKS_EMPTY_SUBMESSAGE: 'Audio reinforces learning through listening',

  // Practice tab empty state - user-centric and study-focused
  STUDY_LIST_EMPTY_TITLE: 'Master Arabic vocabulary',
  STUDY_LIST_EMPTY_DESCRIPTION:
    'Tap any word while reading to add it to your study list. Review on a schedule that helps you remember.',
  STUDY_LIST_EMPTY_SUBMESSAGE: 'Start with articles at your level',

  // Dictionary
  NO_STUDY_WORDS: 'No words to study',
  ADD_WORDS_TO_STUDY_LIST: 'Add words from articles to study',
  SEARCH_WORDS_PLACEHOLDER: 'Search words...',
  DUE_WORDS_TITLE: 'Due Words',
  MASTERED_WORDS_TITLE: 'Mastered Words',
  DICTIONARY_TITLE: 'Dictionary',

  PROGRESS_NOT_AVAILABLE: 'Progress unavailable',
  ERROR_LOADING_DATA: "Couldn't load data",

  // Success messages - encouraging and celebration-focused
  SESSION_COMPLETE: 'Session complete',

  ADDED_TO_BOOKMARKS: 'Saved to bookmarks',
  REMOVED_FROM_BOOKMARKS: 'Removed from bookmarks',
  ADDED_TO_STUDY_LIST: 'Added to study list',
  REMOVED_FROM_STUDY_LIST: 'Removed from study list',

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
  ALREADY_HAVE_ACCOUNT: 'Already have an account?',
  DONT_HAVE_ACCOUNT: "Don't have an account?",
  YOUR_EMAIL: 'Email',
  YOUR_PASSWORD: 'Password',
  PASSWORD_REQUIREMENTS_HINT:
    'At least {minLength} characters with uppercase, lowercase, and a number',
  ARE_YOU_SURE_SIGN_OUT: 'Are you sure you want to sign out of your account?',
  ENTER_VALID_EMAIL: 'Enter a valid email',
  ENTER_PASSWORD: 'Enter your password',
  PASSWORD_ADD_CHARACTER_TYPES: 'Add uppercase, lowercase, and a number',
  PASSWORD_USE_AT_LEAST_TEMPLATE: 'Use at least {minLength} characters',
  FORGOT_PASSWORD: 'Forgot password?',
  RESET_PASSWORD: 'Reset password',
  RESET_PASSWORD_EMAIL_SENT: 'Check your email for a password reset link',
  RESET_PASSWORD_ERROR: 'Failed to send reset email',
  EMAIL_CONFIRMATION_REQUIRED: "We'll send you a confirmation email",
  PASSWORD_STRENGTH_WEAK: 'Weak',
  PASSWORD_STRENGTH_FAIR: 'Fair',
  PASSWORD_STRENGTH_GOOD: 'Good',
  PASSWORD_STRENGTH_STRONG: 'Strong',
  PASSWORD_REQUIREMENT_LENGTH: 'At least {minLength} characters',
  PASSWORD_REQUIREMENT_UPPERCASE: 'One uppercase letter',
  PASSWORD_REQUIREMENT_LOWERCASE: 'One lowercase letter',
  PASSWORD_REQUIREMENT_NUMBER: 'One number',
  TERMS_OF_SERVICE: 'Terms of Service',
  PRIVACY_POLICY: 'Privacy Policy',
  BY_CONTINUING_YOU_AGREE: 'By continuing, you agree to our',
  AND: 'and',

  // Terms of Service - Full text
  TERMS_EFFECTIVE_DATE: 'Effective Date: January 1, 2025',
  TERMS_INTRO:
    'Welcome to OpenArabic. By using our app, you agree to these terms. Please read them carefully.',
  TERMS_SERVICE_DESCRIPTION_TITLE: '1. Our Service',
  TERMS_SERVICE_DESCRIPTION:
    'OpenArabic is an Arabic language learning platform. We provide articles, audio content, vocabulary tools, and spaced repetition learning features to help you learn Arabic.',
  TERMS_ACCOUNT_TITLE: '2. Your Account',
  TERMS_ACCOUNT:
    'You can create an account using email and password, Apple Sign In, or Google Sign In. You are responsible for maintaining the security of your account. Provide accurate information and keep your password confidential.',
  TERMS_ACCEPTABLE_USE_TITLE: '3. Acceptable Use',
  TERMS_ACCEPTABLE_USE:
    'Use OpenArabic for personal learning only. Do not attempt to harm the service, access it through unauthorized means, or use it for any unlawful purpose.',
  TERMS_CONTENT_TITLE: '4. Content and Rights',
  TERMS_CONTENT:
    'All content on OpenArabic, including articles, translations, audio, and educational materials, is owned by OpenArabic or licensed to us. You may use it for personal learning but may not redistribute, republish, or use it commercially.',
  TERMS_USER_DATA_TITLE: '5. Your Data',
  TERMS_USER_DATA:
    'You own your learning data (reading progress, vocabulary lists, study history). We collect and use this data as described in our Privacy Policy to provide and improve the service.',
  TERMS_DISCLAIMER_TITLE: '6. Disclaimers',
  TERMS_DISCLAIMER:
    'OpenArabic is provided "as is" without warranties of any kind. We strive for accuracy but cannot guarantee that all content is error-free. Your use of the app is at your own risk.',
  TERMS_LIABILITY_TITLE: '7. Limitation of Liability',
  TERMS_LIABILITY:
    'OpenArabic and its developers are not liable for any indirect, incidental, or consequential damages arising from your use of the service.',
  TERMS_CHANGES_TITLE: '8. Changes to Terms',
  TERMS_CHANGES:
    'We may update these terms from time to time. Continued use of OpenArabic after changes means you accept the updated terms.',
  TERMS_TERMINATION_TITLE: '9. Termination',
  TERMS_TERMINATION:
    'We may suspend or terminate your access if you violate these terms. You may stop using OpenArabic at any time.',
  TERMS_CONTACT_TITLE: '10. Contact',
  TERMS_CONTACT: 'Questions about these terms? Contact us at yunus@edenmind.com',

  // Privacy Policy - Full text
  PRIVACY_EFFECTIVE_DATE: 'Effective Date: January 1, 2025',
  PRIVACY_INTRO:
    'Your privacy is important to us. This policy explains what information we collect, how we use it, and your rights.',
  PRIVACY_COLLECTION_TITLE: '1. Information We Collect',
  PRIVACY_COLLECTION_ACCOUNT: 'Account Information',
  PRIVACY_COLLECTION_ACCOUNT_DESC:
    'When you create an account, we collect your email address. If you use Apple or Google Sign In, we receive basic profile information from those services.',
  PRIVACY_COLLECTION_LEARNING: 'Learning Data',
  PRIVACY_COLLECTION_LEARNING_DESC:
    'We store your reading progress, vocabulary lists, study session history, review performance, and app preferences (theme, audio settings, notifications).',
  PRIVACY_COLLECTION_ANALYTICS: 'Usage Analytics',
  PRIVACY_COLLECTION_ANALYTICS_DESC:
    'We use Mixpanel to track basic events like sign in, sign up, and practice sessions. This helps us understand how the app is used and improve it.',
  PRIVACY_USE_TITLE: '2. How We Use Your Information',
  PRIVACY_USE:
    'We use your data to: provide the learning service, sync your progress across devices, personalize your learning experience, send study reminders (if enabled), and improve the app.',
  PRIVACY_THIRD_PARTY_TITLE: '3. Third-Party Services',
  PRIVACY_THIRD_PARTY_SUPABASE: 'Supabase',
  PRIVACY_THIRD_PARTY_SUPABASE_DESC:
    'We use Supabase for authentication, database, and file storage. Your data is stored securely on their servers.',
  PRIVACY_THIRD_PARTY_MIXPANEL: 'Mixpanel',
  PRIVACY_THIRD_PARTY_MIXPANEL_DESC:
    'We use Mixpanel for analytics to understand app usage patterns and improve the learning experience.',
  PRIVACY_THIRD_PARTY_AUTH: 'Apple and Google',
  PRIVACY_THIRD_PARTY_AUTH_DESC:
    'If you sign in with Apple or Google, their privacy policies apply to the authentication process.',
  PRIVACY_SECURITY_TITLE: '4. Data Security',
  PRIVACY_SECURITY:
    'We take reasonable measures to protect your data, including encrypted connections and secure authentication. However, no internet service is 100% secure.',
  PRIVACY_RIGHTS_TITLE: '5. Your Rights',
  PRIVACY_RIGHTS:
    'You can access, update, or delete your account data at any time. To delete your account and all associated data, contact us at yunus@edenmind.com',
  PRIVACY_CHILDREN_TITLE: "6. Children's Privacy",
  PRIVACY_CHILDREN:
    'OpenArabic is not intended for children under 13. We do not knowingly collect information from children under 13.',
  PRIVACY_CHANGES_TITLE: '7. Changes to This Policy',
  PRIVACY_CHANGES:
    'We may update this privacy policy from time to time. We will notify you of significant changes through the app or by email.',
  PRIVACY_CONTACT_TITLE: '8. Contact Us',
  PRIVACY_CONTACT:
    'Questions about privacy? Contact us at yunus@edenmind.com. We will respond to your inquiry as soon as possible.',

  // Social auth
  SIGN_IN_WITH_APPLE: 'Sign in with Apple',
  SIGN_IN_WITH_GOOGLE: 'Sign in with Google',
  CONTINUE_WITH: 'or',
  SOCIAL_AUTH_FAILED: 'Sign in failed',
  SOCIAL_AUTH_CANCELLED: 'Sign in cancelled',
  SOCIAL_AUTH_NETWORK_ERROR: 'Network error. Check connection and try again',
  ACCOUNT_ALREADY_EXISTS: 'Account with this email already exists',

  RESET_PROGRESS: 'Reset progress',

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

  INSIGHTS_UNAVAILABLE: 'Insights unavailable',
  INFO: 'Info',
  MEMORY_STRENGTH_INFO: 'About memory strength',

  WORD_MASTERY: 'Words Mastered',
  LEARNED_WORDS: 'Words Learning',
  LEARNING_PROGRESS: 'Learning Progress',
  REVIEW_TIMING: 'Memory strength',
  REVIEW_TIMING_EXPLANATION:
    'Reviews are scheduled when recall drops. Clearing due words restores memory strength; strengthening weak words improves overall retention.',
  MEMORY_STRENGTH_OPTIMAL_TIMING: 'Optimal timing for reviews based on your memory strength',
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

  // Practice bottom sheet subtitles (condensed for subtitle format)
  MEMORY_STRENGTH_SUBTITLE:
    'Percentage of words you are expected to recall at a given time. Target at least 75% before adding new words',
  WORD_MASTERY_SUBTITLE: 'Words with strong, stable memories requiring minimal review',
  LEARNED_WORDS_SUBTITLE: 'Words you are learning that are building toward mastery',
  LEARNING_RATE_SUBTITLE: 'Learning efficiency and speed trends over recent days',
  DUE_WORDS_FORECAST_SUBTITLE: 'Upcoming reviews for the next 7 days',
  MEMORY_RETENTION_OPTIMAL_TIMING:
    'Optimal review scheduling, indicating daily recall to guide retention.',
  DUE_WORDS_FORECAST: 'Due Words Forecast',
  DUE_WORDS_FORECAST_EXPLANATION:
    'Projected due words over the next 7 days, helping you plan study sessions and manage review workload.',

  // Memory retention modal
  MEMORY_RETENTION_EXPLANATION:
    'Memory strength shows how many words you still remember. Try to stay over 75% before you add new words.',
  MEMORY_RETENTION_TIP:
    'Stay above the {threshold}% threshold line. Practice existing words before adding new ones.',

  // Account
  HELP: 'Help',
  CONTACT_SUPPORT: 'Support',
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
  CLEAR_CACHE: 'App cache',
  NO_CACHE: 'No cache',
  NO_CACHED_FILES: 'No cached files to clear',
  THIS_WILL_DELETE: 'This deletes',
  AUDIO_REDOWNLOAD_REQUIRED: 'Audio will re-download when needed',
  DATA_RELOAD_REQUIRED: 'Data will reload when needed',

  // Reading progress management
  RESET_READING_PROGRESS: 'Reading progress',
  RESET_READING_PROGRESS_CONFIRMATION: 'Are you sure you want to reset all reading progress?',
  THIS_WILL_DELETE_ALL_READING_PROGRESS:
    'This will delete reading positions and progress percentages for all articles. This cannot be undone.',
  READING_PROGRESS_RESET_SUCCESSFULLY: 'Reading progress reset successfully',
  FAILED_TO_RESET_READING_PROGRESS: "Couldn't reset reading progress. " + tryAgain,

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

  // Filter options
  ALL_DIFFICULTIES: 'All difficulties',
  ALL_AUTHORS: 'All authors',

  // Audio fallbacks
  ARABIC_TITLE_FALLBACK: 'Arabic',

  // Dictionary fallbacks
  ARABIC_PRONUNCIATION_FALLBACK: 'Arabic Pronunciation',
  UNKNOWN_ARABIC: 'Unknown Arabic',
  UNKNOWN_ENGLISH: 'Unknown English',
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
  FAILED_TO_LOAD_DIFFICULTY_LEVELS: "Couldn't load difficulty levels. " + tryAgain,
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
  FAILED_TO_STOP_AUDIO_ON_CLOSE: "Couldn't stop audio on close. " + tryAgain,
  FAILED_TO_LOAD_AUDIO: "Couldn't load audio. " + tryAgain,
  FAILED_TO_SKIP_TO_NEXT_TRACK: "Couldn't skip track. " + tryAgain,
  AUDIO_PLAYBACK_FAILED: 'Audio playback failed. ' + tryAgain,
  AUDIO_GENERATION_FAILED: 'Audio generation failed. ' + tryAgain,

  // Reading list errors
  FAILED_TO_LOAD_BOOKMARKS: "Couldn't load bookmarks. " + tryAgain,
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
  FAILED_TO_LOAD_STUDY_WORDS: "Couldn't load study words. " + tryAgain,
  FAILED_TO_UPDATE_WORD: "Couldn't update word. " + tryAgain,
  FAILED_TO_RECORD_REVIEW: "Couldn't record review. " + tryAgain,
  FAILED_TO_UPDATE_WORD_AND_REVIEW: "Couldn't update word and record review. " + tryAgain,
  FAILED_TO_TOGGLE_STUDY_WORD: "Couldn't toggle study word. " + tryAgain,
  FAILED_TO_DELETE_WORD: "Couldn't delete word. " + tryAgain,
  FAILED_TO_LOAD_PRACTICE_DATA: "Couldn't load practice data. " + tryAgain,

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

  // Practice button disabled messages - concise guidance
  COMPLETE_DUE_FIRST: 'Review due words first',
  FOCUS_ON_STRUGGLING_FIRST: 'Strengthen struggling words first',
  NO_PRACTICE_NEEDED: 'All caught up. Add new words to continue learning',
  GET_STARTED_MESSAGE: 'Browse articles in the Library tab to add words you want to learn',
  PRACTICE_OPTIONS: 'Study options',

  // Learning method content
  LEARNING_METHOD_INTRO:
    "Language acquisition occurs through understanding sentences with translations, not grammar instruction. According to Krashen's Input Hypothesis, the brain naturally identifies patterns through exposure to comprehensible input.",
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
    'Consistent exposure to comprehensible input builds linguistic competence over time. Each reading session contributes to your developing Arabic competence through unconscious acquisition.',
  APPROACH_VALIDATED_BY_RESEARCH:
    'This approach has successfully taught Arabic for centuries. Modern SLA research validates combining authentic texts with translation support for optimal comprehensible input.',

  // Audio player errors
  ERROR_SELECTED_TRACK_NO_URL: 'Selected track has no audio URL',
  ERROR_SELECTED_TRACK_NOT_FOUND: 'Selected track not found',
  ERROR_FAILED_PROCESS_FIRST_TRACK: 'Failed to process first track',

  // Encouraging metrics templates
  ACCURACY_EXCELLENT_TEMPLATE: '{percent}% accuracy',
  ACCURACY_SOLID_TEMPLATE: '{percent}% accuracy',
  WORDS_STRONG_SESSION_TEMPLATE: '{count} words mastered',
  STREAK_EXCELLENT_TEMPLATE: '{count}-word streak',
  STREAK_ACHIEVED_TEMPLATE: '{count}-word streak',
  MASTERED_WORDS_TEMPLATE: '{count} words mastered',
  MEMORY_STRENGTH_BOOST_TEMPLATE: '+{days} days stronger',
  WORDS_PER_MIN_TEMPLATE: '{rate} words/min',
  WORDS_REVIEWED_DEDICATION_TEMPLATE: '{count} words reviewed',
  WORDS_REVIEWED_GREAT_TEMPLATE: '{count} words reviewed',

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

  FAQ_READ_VS_LISTEN_Q: "What's the difference between Library and Bookmarks?",
  FAQ_READ_VS_LISTEN_A:
    'Library lets you browse articles and add vocabulary. Bookmarks lets you listen to saved articles while multitasking.',

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

  // Chart empty states
  CHART_EMPTY_STATE: 'Add your first words to start tracking your progress',
} as const;

export type StringKey = keyof typeof STRINGS;
