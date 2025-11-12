// Helper functions for consistent messaging
const tryAgain = 'Try again';
export const STRINGS = {
  // Settings & preferences
  STUDY_REMINDERS: 'Practice reminders',
  TIME: 'Time',
  THEME: 'Theme',
  ARABIC_FONT: 'Arabic font',
  // Shared bilingual label
  BILINGUAL_LABEL: 'English + Arabic',
  AUDIO_LANGUAGE: 'Audio language',
  AUDIO_LANGUAGE_ARABIC: 'Arabic only',
  AUDIO_LANGUAGE_ARABIC_SUBTITLE: 'Play only Arabic audio',
  AUDIO_LANGUAGE_BILINGUAL_SUBTITLE: 'Play bilingual audio (English then Arabic)',
  AUDIO_SHUFFLE: 'Shuffle audio',
  AUDIO_SHUFFLE_DESCRIPTION: 'Plays articles in random order in the Saved tab',
  HAPTICS: 'Haptic feedback',
  WORD_DETAILS: 'Minimal word tooltips',
  WORD_DETAILS_DESCRIPTION: 'Hide chevron icon for a cleaner interface',
  DISPLAY_LANGUAGE: 'Display language',
  DISPLAY_LANGUAGE_ARABIC: 'Arabic only',
  DISPLAY_LANGUAGE_ARABIC_SUBTITLE: 'Show only Arabic text',
  DISPLAY_LANGUAGE_BILINGUAL_SUBTITLE: 'Show Arabic with English translations',
  DAILY_WORD_LIMIT: 'Daily word limit',
  WORDS_REMAINING_TODAY: '{count} words remaining today',
  // Contact email - single source of truth
  CONTACT_EMAIL: 'yunus+openarabic@edenmind.com',
  // Account section titles - now imported directly from enums in components
  ACCOUNT: 'Account',
  APPEARANCE_SECTION: 'Appearance',
  DATA_SECTION: 'Storage',
  DATA_ACCOUNT_SECTION: 'Account',
  DANGER_ZONE_SECTION: 'Danger zone',
  RESET_READING_PROGRESS_DESCRIPTION: 'Clears all reading history, streaks, and progress tracking',
  DELETE_ACCOUNT_DESCRIPTION: 'Permanently removes your account and all data',
  // Social Media
  FOLLOW_US: 'Follow us',
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TWITTER_URL: 'https://x.com/openarabicio',
  INSTAGRAM_URL: 'https://www.instagram.com/openarabic.io/',
  FACEBOOK_URL: 'https://www.facebook.com/OpenArabic.io/',
  // App Store Review
  RATE_APP: 'Rate OpenArabic',
  // Theme names
  THEME_BIRCHES: 'Birches in Spring',
  THEME_MIDNIGHT: 'Midnight Summer',
  THEME_AUTUMN: 'Autumn Leaves',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  PLEASE_TRY_AGAIN: tryAgain,
  LOADING_ARTICLES: 'Loading articles',
  LOADING_AUDIO_ELLIPSIS: 'Loading session...',
  AUDIO_READY: 'Audio ready',
  PREPARING_PRACTICE_SESSION: 'Preparing practice session...',
  // Timer controls
  STOP_TIMER: 'Stop timer',
  TIME_REMAINING: 'Time remaining',
  // Welcome & onboarding
  WELCOME_TITLE: 'Welcome to OpenArabic',
  WELCOME_SUBTITLE: 'Sign in to continue learning Arabic',
  // Sign In screen
  SIGN_IN_TITLE: 'Sign in to OpenArabic',
  SIGN_IN_SUBTITLE: 'Welcome back! Continue your Arabic learning journey.',
  // Sign Up screen
  CREATE_ACCOUNT_TITLE: 'Create your account',
  CREATE_ACCOUNT_SUBTITLE: 'Start your journey to mastering Arabic.',
  // Landing screen
  CONTINUE_WITH_EMAIL_OPTION: 'Continue with email',
  HIDE_EMAIL_OPTIONS: 'Hide email options',
  AUTHOR_ARTICLES: 'Author Articles',
  CATEGORY: 'Category',
  RESUMED_READING_TEMPLATE: 'Resumed at {percent}%',
  // Article & content actions - shortened and action-oriented
  BROWSE_ARTICLES: 'Explore articles',
  PULL_TO_REFRESH: 'Pull to refresh',
  PREPARING_ARTICLES: 'Preparing articles...',
  // Article section headings (for progress-based sorting)
  CONTINUE_READING: 'Continue Reading',
  UNREAD: 'Unread',
  COMPLETED: 'Completed',
  SET_TIME: 'Set time',
  // Empty states & hints - more actionable
  TRY_ADJUSTING_FILTERS: 'Try different filters',
  NO_ARTICLES_FOUND: 'No matches found',
  // Saved tab empty state - emphasizes on-the-go bilingual learning
  BOOKMARKS_EMPTY_TITLE: 'Build your listening routine',
  BOOKMARKS_EMPTY_DESCRIPTION:
    'Bookmark articles to listen with bilingual audio on the go—while commuting, exercising, or unwinding',
  // Practice tab empty state - benefit-first with spaced repetition explanation
  STUDY_LIST_EMPTY_TITLE: 'Remember what you learn',
  STUDY_LIST_EMPTY_DESCRIPTION:
    'Tap words while reading articles, then practice at optimal intervals with spaced repetition',
  ERROR_LOADING_DATA: "Couldn't load data",
  // Success messages - encouraging and celebration-focused
  SESSION_COMPLETE: 'Session complete',
  SESSION_COMPLETE_EDUCATIONAL:
    'Your words will return at the perfect moment for lasting retention.',
  ADDED_TO_BOOKMARKS: 'Saved to bookmarks',
  REMOVED_FROM_BOOKMARKS: 'Removed from bookmarks',
  // Word action buttons
  ADD_TO_PRACTICE: 'Add to Practice',
  REMOVE_FROM_PRACTICE: 'Remove from Practice',
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
  DONT_HAVE_ACCOUNT: 'New to OpenArabic?',
  YOUR_EMAIL: 'Email',
  YOUR_PASSWORD: 'Password',
  ARE_YOU_SURE_SIGN_OUT: 'Sign out of your account?',
  ENTER_VALID_EMAIL: 'Enter a valid email',
  ENTER_PASSWORD: 'Enter your password',
  PASSWORD_USE_AT_LEAST_TEMPLATE: 'Use at least {minLength} characters',
  FORGOT_PASSWORD: 'Forgot password?',
  RESET_PASSWORD_EMAIL_SENT: 'Check your email for a password reset link',
  RESET_PASSWORD_ERROR: "Couldn't send reset email. " + tryAgain,
  PASSWORD_STRENGTH_GOOD: 'Good',
  PASSWORD_STRENGTH_STRONG: 'Strong',
  PASSWORD_REQUIREMENT_LENGTH: 'At least {minLength} characters',
  TERMS_OF_SERVICE: 'Terms of Service',
  PRIVACY_POLICY: 'Privacy Policy',
  BY_CONTINUING_YOU_AGREE: 'By continuing, you agree to our',
  AND: 'and',
  // Terms of Service - Full text
  TERMS_EFFECTIVE_DATE: 'Effective Date: January 1, 2025',
  TERMS_INTRO: 'Welcome to OpenArabic. By using our app, you agree to these terms.',
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
  TERMS_CONTACT: 'Questions about these terms? Contact us at ',
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
    'We use your data to: provide the learning service, sync your progress across devices, personalize your learning experience, send practice reminders (if enabled), and improve the app.',
  PRIVACY_THIRD_PARTY_TITLE: '3. Third-Party Services',
  PRIVACY_THIRD_PARTY_SUPABASE: 'Supabase',
  PRIVACY_THIRD_PARTY_SUPABASE_DESC:
    'We use Supabase for authentication, database, and file storage. Your data is stored securely on their servers.',
  PRIVACY_THIRD_PARTY_MIXPANEL: 'Mixpanel',
  PRIVACY_THIRD_PARTY_MIXPANEL_DESC:
    'We use Mixpanel for analytics to understand app usage patterns and improve the learning experience.',
  PRIVACY_THIRD_PARTY_SENTRY: 'Sentry',
  PRIVACY_THIRD_PARTY_SENTRY_DESC:
    'We use Sentry for error tracking and crash reporting to identify and fix issues that affect app stability and performance.',
  PRIVACY_THIRD_PARTY_AUTH: 'Apple and Google',
  PRIVACY_THIRD_PARTY_AUTH_DESC:
    'If you sign in with Apple or Google, their privacy policies apply to the authentication process.',
  PRIVACY_SECURITY_TITLE: '4. Data Security',
  PRIVACY_SECURITY:
    'We take reasonable measures to protect your data, including encrypted connections and secure authentication. However, no internet service is 100% secure.',
  PRIVACY_RIGHTS_TITLE: '5. Your Rights',
  PRIVACY_RIGHTS:
    'You can access, update, or delete your account data at any time. To delete your account and all associated data, contact us at ',
  PRIVACY_CHILDREN_TITLE: "6. Children's Privacy",
  PRIVACY_CHILDREN:
    'OpenArabic is not intended for children under 13. We do not knowingly collect information from children under 13.',
  PRIVACY_CHANGES_TITLE: '7. Changes to This Policy',
  PRIVACY_CHANGES:
    'We may update this privacy policy from time to time. We will notify you of significant changes through the app or by email.',
  PRIVACY_CONTACT_TITLE: '8. Contact Us',
  PRIVACY_CONTACT: 'Questions about privacy? Contact us at ',
  PRIVACY_CONTACT_SUFFIX: '. We will respond to your inquiry as soon as possible.',
  // Social auth
  SIGN_IN_WITH_APPLE: 'Sign in with Apple',
  SIGN_IN_WITH_GOOGLE: 'Sign in with Google',
  CONTINUE_WITH: 'or',
  MEMORY_STRENGTH: 'Memory strength',
  WORD_MASTERY: 'Words Mastered',
  // Practice bottom sheet subtitles (condensed for subtitle format)
  MEMORY_STRENGTH_SUBTITLE:
    'Percentage of words you are expected to recall at a given time. Target at least 75% before adding new words',
  WORD_MASTERY_SUBTITLE: 'Words with strong, stable memories requiring minimal review',
  DUE_WORDS_FORECAST_SUBTITLE: 'Upcoming reviews for the next 7 days',
  DUE_WORDS_FORECAST: 'Due Words Forecast',
  // Account - Support section
  HELP_CENTER: 'Help Center',
  CONTACT_SUPPORT: 'Contact Support',
  // Account - About section
  ABOUT_SECTION: 'About',
  APP_VERSION_LABEL: 'Version',
  COPYRIGHT_SYMBOL: '\u00A9',
  NO_EMAIL: 'No email',
  BYTE_UNITS: ['Bytes', 'KB', 'MB', 'GB'] as const,
  ERROR_PRIORITY_QUEUE_LENGTH_MISMATCH: 'Items and priorities arrays must have the same length',
  // Cache management - clearer and more actionable
  CLEAR_CACHE: 'App cache',
  CLEAR_CACHE_BUTTON: 'Clear',
  NO_CACHE: 'No cache',
  NO_CACHED_FILES: 'No cached files to clear',
  DATA_RELOAD_REQUIRED: 'Data loads when you open the app',
  // Reading progress management
  RESET_READING_PROGRESS: 'Reading progress',
  THIS_WILL_DELETE_ALL_READING_PROGRESS:
    'This will delete reading positions and progress percentages for all articles. This cannot be undone.',
  READING_PROGRESS_RESET_SUCCESSFULLY: 'Reading progress reset',
  FAILED_TO_RESET_READING_PROGRESS: "Couldn't reset reading progress. " + tryAgain,
  // Notifications
  ENABLE_NOTIFICATIONS: 'Enable notifications',
  TURN_ON_NOTIFICATIONS: 'Get daily practice reminders',
  OPEN_SETTINGS: 'Open Settings',
  NOTIFICATIONS_DISABLED: 'Notifications disabled',
  NOTIFICATION_REMINDER_TITLE: 'Time to study Arabic!',
  NOTIFICATION_REMINDER_BODY: 'Continue your Arabic learning journey',
  START_REVIEWING_TO_BUILD_STRENGTH: 'Practice some vocabulary to see memory strength',
  START_PRACTICING_TO_SEE_SPEED: 'Practice some vocabulary to see your learning speed',
  STUDY_TO_MONITOR_REVIEW_TIMING: 'Practice some vocabulary to see review schedule',
  STUDY_WORDS_TO_TRACK_MEMORY_RETENTION: 'Practice to track retention',
  // Performance indicators
  PERFORMING_EXCELLENTLY: 'Performing excellently',
  PERFORMING_WELL: 'Performing well',
  OUTSTANDING_PERFORMANCE: 'Outstanding performance',
  ROOM_FOR_IMPROVEMENT: 'Room for improvement',
  TRENDING_UPWARD: 'trending upward',
  TRENDING_DOWNWARD: 'trending downward',
  STEADY_PERFORMANCE: 'steady performance',
  ALL_WORDS_LOOK_STABLE: 'All words look stable',
  ON_TRACK_WITH_USUAL_SPEED: 'On track with your usual speed',
  FASTER_THAN_USUAL: 'Faster than usual',
  SLOWER_THAN_USUAL: 'Slower than usual',
  RECOMMENDED: 'Recommended',
  // Error messages - actionable with next steps
  ERROR: 'Error',
  UNKNOWN_ERROR_OCCURRED: 'Something went wrong',
  SIGN_IN_FAILED: 'Sign in failed',
  ACCOUNT_CREATION_FAILED: 'Account creation failed',
  REFRESH_FAILED: 'Refresh failed',
  FAILED_TO_LOAD_ARTICLES: "Couldn't load articles. " + tryAgain,
  FAILED_TO_LOAD_ARTICLE: "Couldn't load article. " + tryAgain,
  FAILED_TO_LOAD_FILTER_OPTIONS: "Couldn't load filters. " + tryAgain,
  FAILED_TO_LOAD_AUTHORS: "Couldn't load authors. " + tryAgain,
  UNABLE_TO_LOAD_CHART_DATA: "Couldn't load chart. " + tryAgain,
  FAILED_TO_GENERATE_AUDIO_TRACK: "Couldn't generate track. " + tryAgain,
  FAILED_TO_GET_ENHANCED_AUDIO_TRACKS: "Couldn't get tracks. " + tryAgain,
  FAILED_TO_LOAD_AUDIO_TRACKS: "Couldn't load audio tracks. " + tryAgain,
  FAILED_TO_STOP_AUDIO_ON_CLOSE: "Couldn't stop audio on close. " + tryAgain,
  // Reading list errors
  FAILED_TO_LOAD_BOOKMARKS: "Couldn't load bookmarks. " + tryAgain,
  FAILED_TO_ADD_TO_READING_LIST: "Couldn't save article. " + tryAgain,
  FAILED_TO_REMOVE_FROM_READING_LIST: "Couldn't remove article. " + tryAgain,
  FAILED_TO_CHECK_READING_LIST_STATUS: "Couldn't check save status. " + tryAgain,
  ERROR_UPDATING_STUDY_LIST: "Couldn't update practice list. " + tryAgain,
  FAILED_TO_LOAD_STUDY_WORDS: "Couldn't load practice words. " + tryAgain,
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
  FAILED_TO_GET_CACHE_SIZE: "Couldn't check cache size. " + tryAgain,
  // Auth errors
  FAILED_TO_SIGN_OUT: "Couldn't sign out. " + tryAgain,
  // Account deletion
  DELETE_ACCOUNT: 'Delete account',
  DELETE_ACCOUNT_TITLE: 'Delete your account?',
  DELETE_ACCOUNT_WARNING:
    'This will permanently delete your account and all associated data, including:',
  DELETE_ACCOUNT_DATA_LIST: [
    'Reading progress and history',
    'Vocabulary study lists and progress',
    'Bookmarked articles',
    'App preferences and settings',
  ] as const,
  DELETE_ACCOUNT_PERMANENT: 'This action cannot be undone.',
  DELETE_ACCOUNT_SIGNED_IN_AS: 'Signed in as:',
  DELETE_ACCOUNT_ENTER_CONFIRMATION: 'To confirm, type DELETE below:',
  DELETE_ACCOUNT_CONFIRMATION_PLACEHOLDER: 'Type DELETE to confirm',
  DELETE_ACCOUNT_CONFIRMATION_WORD: 'DELETE',
  DELETE_ACCOUNT_CONFIRMATION_MISMATCH: 'Type DELETE to confirm',
  DELETE_ACCOUNT_SUCCESS: 'Account deleted',
  FAILED_TO_DELETE_ACCOUNT: "Couldn't delete account. " + tryAgain,
  ACCOUNT_DELETION_IN_PROGRESS: 'Deleting account...',
  // Sign-in requirements - clearer and shorter
  PLEASE_SIGN_IN_TO_ADD_WORDS: 'Sign in to add words',
  PLEASE_SIGN_IN_TO_ADD_ROOTS: 'Sign in to add roots',
  ERROR_EMPTY_EMAIL: 'Email cannot be empty',
  // Practice button disabled messages - concise guidance
  COMPLETE_DUE_FIRST: 'Review due words first',
  HELP_SEARCH_PLACEHOLDER: 'Search help articles',
  HELP_SEARCH_RESULTS_SINGULAR: 'result',
  HELP_SEARCH_RESULTS_PLURAL: 'results',
  HELP_NO_RESULTS_TITLE: 'No results found',
  HELP_NO_RESULTS_DESCRIPTION: 'Try different keywords or browse categories below',
  HELP_POPULAR_QUESTIONS: 'Popular Questions',
  HELP_STILL_NEED_HELP_TITLE: 'Still need help?',
  HELP_STILL_NEED_HELP_DESCRIPTION:
    "Can't find what you're looking for? Contact the developer directly.",
  // Chart empty states
  CHART_EMPTY_STATE: 'Add your first words to start tracking your progress',
  // Legal & Attributions
  LEGAL_ATTRIBUTIONS: 'Legal & Attributions',
  LEGAL_INTRO:
    'OpenArabic is built with the help of various open source projects and third-party services. We are grateful to the developers and organizations that make their work freely available.',
  LEGAL_AUDIO_TITLE: 'Audio Generation',
  LEGAL_AUDIO_ELEVENLABS: 'ElevenLabs',
  LEGAL_AUDIO_ELEVENLABS_DESC:
    'Text-to-speech API for generating high-quality Arabic and English audio pronunciations.',
  LEGAL_AUDIO_ELEVENLABS_URL: 'https://elevenlabs.io',
  LEGAL_ERROR_TRACKING_TITLE: 'Error Tracking',
  LEGAL_ERROR_SENTRY: 'Sentry',
  LEGAL_ERROR_SENTRY_DESC:
    'Error monitoring and crash reporting to help improve app stability and user experience.',
  LEGAL_ERROR_SENTRY_URL: 'https://sentry.io',
  LEGAL_FONTS_TITLE: 'Typefaces',
  LEGAL_FONTS_ARABIC_TITLE: 'Arabic Fonts',
  LEGAL_FONTS_ENGLISH_TITLE: 'English Fonts',
  LEGAL_FONT_SCHEHERAZADE: 'Scheherazade New',
  LEGAL_FONT_SCHEHERAZADE_DESC: 'SIL Open Font License 1.1',
  LEGAL_FONT_AMIRI: 'Amiri',
  LEGAL_FONT_AMIRI_DESC: 'SIL Open Font License 1.1',
  LEGAL_FONT_MADINA: 'Madina',
  LEGAL_FONT_MADINA_DESC: 'Custom Arabic font',
  LEGAL_FONT_NASTALIQ: 'Nastaliq',
  LEGAL_FONT_NASTALIQ_DESC: 'Traditional calligraphic Arabic script',
  LEGAL_FONT_NOTO_SANS: 'Noto Sans',
  LEGAL_FONT_NOTO_SANS_DESC: 'SIL Open Font License 1.1 by Google',
  LEGAL_FONTS_SYSTEM_NOTE:
    'English UI text uses native system fonts (SF Pro on iOS, Roboto on Android) for optimal performance and native feel.',
  LEGAL_OPEN_SOURCE_TITLE: 'Open Source Libraries',
  LEGAL_OPEN_SOURCE_DESC:
    'This app is built with React Native, Expo, and many other open source libraries. Full license details are available in the app repository.',
  LEGAL_LICENSE_INFO: 'License Information',
  LEGAL_SIL_OFL_TITLE: 'SIL Open Font License 1.1',
  LEGAL_SIL_OFL_DESC:
    'Fonts licensed under SIL OFL are free to use, modify, and distribute. Full license text available at scripts.sil.org/OFL',
} as const;
