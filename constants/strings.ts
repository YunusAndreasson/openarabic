// Helper functions for consistent messaging
const tryAgain = 'Try again';
export const STRINGS = {
  // Common actions
  CANCEL: 'Cancel',
  RETRY: 'Retry',
  RESET: 'Reset',
  // Settings & preferences
  STUDY_REMINDERS: 'Smart reminders',
  SMART_REMINDERS_SUBTITLE: 'Timed to when your words start to fade',
  TIME: 'Preferred time',
  THEME: 'Theme',
  ARABIC_FONT: 'Arabic font',
  FONT_SIZE: 'Font size',
  // Shared bilingual label
  BILINGUAL_LABEL: 'English + Arabic',
  AUDIO_LANGUAGE: 'Audio language',
  AUDIO_LANGUAGE_ARABIC: 'Arabic only',
  AUDIO_LANGUAGE_ARABIC_SUBTITLE: 'For more fluent listeners',
  AUDIO_LANGUAGE_BILINGUAL_SUBTITLE: 'Hear English first to prepare for Arabic',
  AUDIO_SHUFFLE: 'Shuffle',
  HAPTICS: 'Haptics',
  // Voice grading
  SPEAK_ANSWER: 'Speak the English answer',
  SPEAK_ANSWER_IDLE_SUBTITLE: 'Say the English meaning. Close-enough counts.',
  SPEAK_ANSWER_DOWNLOADING_SUBTITLE: 'Downloading voice model… {pct}%',
  SPEAK_ANSWER_READY_SUBTITLE: 'Ready · about 460 MB on device',
  SPEAK_ANSWER_ERROR_SUBTITLE: "Couldn't load voice model. Try again later.",
  VOICE_LISTENING: 'Listening…',
  VOICE_CHECKING: 'Grading…',
  VOICE_PREPARING: 'Preparing voice…',
  VOICE_TRY_AGAIN: 'Try again or tap to grade',
  VOICE_MIC_PERMISSION_DENIED: 'Microphone access is off. Voice grading disabled.',
  VOICE_PAUSE_LABEL: 'Pause voice grading for this session',
  VOICE_RESUME_LABEL: 'Resume voice grading',
  // Voice result panel — shown when the recognizer couldn't confirm a match.
  // Framed as a neutral self-grade ("did you get it right?") rather than a
  // verdict, so the buttons answer the question the You-said/Answer comparison
  // sets up instead of asking the user to ratify the ASR.
  VOICE_RESULT_QUESTION: 'Did you get it right?',
  VOICE_RESULT_NOT_HEARD: "Didn't catch that",
  VOICE_RESULT_HEARD_LABEL: 'You said',
  VOICE_RESULT_ANSWER_LABEL: 'Answer',
  VOICE_RESULT_SILENCE: 'no clear speech',
  VOICE_RESULT_ACCEPT: 'Yes, I got it',
  VOICE_RESULT_REJECT: 'No, I missed it',
  VOICE_RESULT_RETRY: 'Try again',
  // Reveal-first self-grade (shown after the card flips to its answer)
  SHOW_ANSWER: 'Show answer',
  GRADE_FORGOT: 'Forgot',
  GRADE_GUESSED: 'Guessed',
  GRADE_KNEW_IT: 'Knew it',
  NO_TRANSLATION_AVAILABLE: 'No translation available',
  // Advanced (Account → Advanced) — voice grading diagnostics
  ADVANCED: 'Advanced',
  ADVANCED_VOICE_GRADING: 'Voice grading',
  ADVANCED_VOICE_GRADING_SUBTITLE: 'Models, recording knobs, and debug',
  ADVANCED_MODELS_SECTION: 'Models',
  ADVANCED_RECORDING_SECTION: 'Voice recording',
  ADVANCED_DEBUG_SECTION: 'Debug',
  ADVANCED_DEBUG_FOOTER:
    'Recording knobs apply to the next recording. Defaults are the shipped values.',
  ADVANCED_MODEL_PARAKEET: 'Speech-to-text (Parakeet)',
  ADVANCED_MODEL_READY: 'Ready',
  ADVANCED_MODEL_NOT_LOADED: 'Not loaded',
  ADVANCED_MODEL_DOWNLOADING: 'Downloading {pct}%',
  ADVANCED_MODEL_VOICE_OFF: 'Voice grading off',
  ADVANCED_ENERGY_GATE: 'Energy gate',
  ADVANCED_ENERGY_GATE_SUBTITLE: 'Auto-stop on trailing silence',
  ADVANCED_GAIN_NORM: 'Gain normalization',
  ADVANCED_GAIN_NORM_SUBTITLE: 'Peak-normalize audio before grading',
  ADVANCED_IOS_RAW: 'iOS raw mode',
  ADVANCED_IOS_RAW_SUBTITLE: "'measurement' mode — no AGC / noise processing",
  ADVANCED_DEBUG_HUD: 'Voice debug HUD',
  ADVANCED_DEBUG_HUD_SUBTITLE: 'Show what was heard + recorder stats in review',
  DISPLAY_LANGUAGE: 'Display language',
  DISPLAY_LANGUAGE_ARABIC: 'Arabic only',
  DISPLAY_LANGUAGE_ARABIC_SUBTITLE: 'For immersive reading practice',
  DISPLAY_LANGUAGE_BILINGUAL_SUBTITLE: 'See English translations below each sentence',
  DAILY_WORD_LIMIT: 'Daily word limit',
  WORDS_REMAINING_TODAY: '{count} new words remaining today',
  ADAPTIVE_PACING: 'Smart pacing',
  ADAPTIVE_PACING_SUBTITLE: 'Pause new words when recent recall drops',
  WORD_TAP_PREVIEW: 'Quick word preview',
  WORD_TAP_PREVIEW_SUBTITLE: 'Tap a word for a small popup instead of the full card',
  RESET_TUTORIALS: 'Reset tutorials',
  RESET_TUTORIALS_TITLE: 'Reset tutorials?',
  RESET_TUTORIALS_MESSAGE: 'See helpful tips again as you explore the app.',
  // Tutorial copy
  TUTORIAL_WORD_TAP_CTA: 'Tap the highlighted word to see its meaning — then add it to practice',
  // Review tutorial - Intro
  TUTORIAL_INTRO_TITLE: 'How it works',
  TUTORIAL_INTRO_DESCRIPTION: 'Tap a card to reveal the answer, then rate how well you knew it.',
  // Review tutorial - grade labels
  TUTORIAL_SWIPE_DONT_KNOW: 'Forgot',
  TUTORIAL_SWIPE_KNOW: 'Knew it',
  // Review tutorial - Ready step
  TUTORIAL_SRS_TITLE: "You're ready!",
  TUTORIAL_SRS_DESCRIPTION: 'Rate honestly. We adapt to you.',
  TUTORIAL_SRS_CTA: "Let's go!",
  // Review tutorial navigation
  TUTORIAL_NEXT: 'Got it',
  // Contextual help - Forgot (swipe left)
  TUTORIAL_CONTEXT_LEFT_LINE1: 'Forgot it?',
  TUTORIAL_CONTEXT_LEFT_LINE2: 'Swipe left.',
  TUTORIAL_CONTEXT_LEFT_LINE3: 'It comes back sooner so you focus on hard words.',
  // Contextual help - Knew it (swipe right)
  TUTORIAL_CONTEXT_RIGHT_LINE1: 'Knew it?',
  TUTORIAL_CONTEXT_RIGHT_LINE2: 'Swipe right.',
  TUTORIAL_CONTEXT_RIGHT_LINE3: 'It comes back later so you skip easy words.',
  // Contact email - single source of truth
  CONTACT_EMAIL: 'yunus+openarabic@edenmind.com',
  // Feedback form
  FEEDBACK_PLACEHOLDER: 'What happened? How can we help?',
  FEEDBACK_EMPTY_TITLE: 'Add a message',
  FEEDBACK_EMPTY_MESSAGE: 'Describe what happened so we can help.',
  FEEDBACK_SHORT_TITLE: 'A bit more detail?',
  FEEDBACK_SHORT_MESSAGE: 'Add more detail ({minCharacters}+ characters).',
  FEEDBACK_SUCCESS_TITLE: 'Thanks!',
  FEEDBACK_SUCCESS_MESSAGE: "We've received your feedback and will look into it.",
  FEEDBACK_ERROR_TITLE: "Couldn't send",
  FEEDBACK_ERROR_MESSAGE: "We couldn't send your feedback. Try again or email us directly.",
  FEEDBACK_SCREENSHOT_LABEL: 'Add screenshot (optional)',
  FEEDBACK_SENDING: 'Sending…',
  FEEDBACK_SUBMIT: 'Send feedback',
  // Account section titles - now imported directly from enums in components
  ACCOUNT: 'Account',
  APPEARANCE_SECTION: 'Appearance',
  STORAGE_SECTION: 'Storage',
  DANGER_ZONE_SECTION: 'Danger Zone',
  LEGAL_SECTION: 'Legal',
  RESET_READING_PROGRESS_DESCRIPTION: 'Start fresh with all articles',
  DELETE_ACCOUNT_DESCRIPTION: 'Permanently remove your account and data',
  // Social Media
  FOLLOW_US: 'Connect with us',
  TWITTER: 'X',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TWITTER_URL: 'https://x.com/openarabicio',
  INSTAGRAM_URL: 'https://www.instagram.com/openarabic.io/',
  FACEBOOK_URL: 'https://www.facebook.com/OpenArabic.io/',
  // More from the maker — a single quiet credit. The byline links to Yunus's
  // projects page, which lists his other apps, so this app doesn't have to.
  MORE_FROM_MAKER: 'More from the maker',
  MAKER_BYLINE: 'Made by Yunus Andreasson',
  MAKER_PROJECTS_URL: 'https://andreassonphoto.com/projects',
  // App Store Review
  RATE_APP: 'Rate OpenArabic',
  // Theme names
  THEME_BIRCHES: 'Birches in Spring',
  THEME_MIDNIGHT: 'Midnight Summer',
  THEME_AUTUMN: 'Autumn Leaves',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  PLEASE_TRY_AGAIN: tryAgain,
  LOADING_ARTICLES: 'Loading articles…',
  LOADING_AUDIO_ELLIPSIS: 'Loading session…',
  LOADING_GENERIC: 'Loading…',
  AUDIO_READY: 'Audio ready',
  PREPARING_PRACTICE_SESSION: 'Preparing session…',
  // Timer controls
  SLEEP_TIMER: 'Sleep timer',
  SET_TIMER: 'Set timer',
  // Welcome & onboarding
  WELCOME_TITLE: 'OpenArabic',
  // Auth value proposition — three terse lines, bold leading verb
  AUTH_VALUE_READ_VERB: 'Read',
  AUTH_VALUE_READ: 'classical texts in Arabic and English',
  AUTH_VALUE_TAP_VERB: 'Tap',
  AUTH_VALUE_TAP: 'any word to see it, save it, learn it',
  AUTH_VALUE_LISTEN_VERB: 'Listen',
  AUTH_VALUE_LISTEN: 'in English first, then Arabic',
  // Onboarding — welcome intro (shown once after first sign-in)
  ONBOARDING_STEP_READ_TITLE: 'Read bilingual texts',
  ONBOARDING_STEP_READ_BODY: 'Classical Arabic, sentence by sentence, with English right below.',
  ONBOARDING_STEP_TAP_TITLE: 'Tap any word',
  ONBOARDING_STEP_TAP_BODY: 'See its meaning instantly, then save it to practice.',
  ONBOARDING_STEP_LISTEN_TITLE: 'Listen to bilingual audio',
  ONBOARDING_STEP_LISTEN_BODY: 'English first, then Arabic — your ear knows what to listen for.',
  ONBOARDING_NEXT: 'Next',
  ONBOARDING_CTA: 'Open your first text',
  // Onboarding — Get started checklist on Explore
  CHECKLIST_TITLE: 'Get started',
  CHECKLIST_PROGRESS: '{done} of 3',
  CHECKLIST_READ: 'Read your first text',
  CHECKLIST_SAVE: 'Save a word to practice',
  CHECKLIST_LISTEN: 'Listen to bilingual audio',
  // Sign In screen
  SIGN_IN_TITLE: 'Sign in',
  SIGN_IN_SUBTITLE: 'Welcome back',
  // Sign Up screen
  CREATE_ACCOUNT_TITLE: 'Create account',
  CREATE_ACCOUNT_SUBTITLE: 'Start your Arabic journey',
  CATEGORY: 'Category',
  // Category display names with proper transliteration and English subtitles
  CATEGORIES: {
    aqeedah: { display: '\u02BFAq\u012Bdah', subtitle: 'Islamic Creed' },
    fiqh: { display: 'Fiqh', subtitle: 'Islamic Law' },
    hadith: { display: '\u1E24ad\u012Bth', subtitle: 'Prophetic Traditions' },
    ihsan: { display: 'I\u1E25s\u0101n', subtitle: 'Spiritual Excellence' },
    quran: { display: 'Qur\u02BE\u0101n', subtitle: 'Quranic Studies' },
    seerah: { display: 'S\u012Brah', subtitle: 'History & Biography' },
    tafsir: { display: 'Tafs\u012Br', subtitle: 'Quranic Exegesis' },
  } as Record<string, { display: string; subtitle: string }>,
  // Author display names with proper transliteration (no honorific titles for mobile space)
  AUTHORS: {
    'an-Nawawi': 'an-Nawaw\u012B',
    'Ibn al-Qayyim al-Jawziyyah': 'Ibn al-Qayyim al-Jawziyyah',
    'Ibn Taymiyyah': 'Ibn Taymiyyah',
    'Ibn al-Jawzi': 'Ibn al-Jawz\u012B',
    'Ibn Kathir': 'Ibn Kath\u012Br',
    'al-Imam al-Bukhari': 'al-Bukh\u0101r\u012B',
    'al-Imam Muslim': 'Muslim',
    'Ibn Hajar al-Asqalani': 'Ibn \u1E24ajar al-\u02BFAsqal\u0101n\u012B',
    'al-Imam Malik': 'M\u0101lik',
    'al-Imam ash-Shafii': 'ash-Sh\u0101fi\u02BF\u012B',
    'al-Imam Ahmad ibn Hanbal': 'A\u1E25mad ibn \u1E24anbal',
    'al-Imam at-Tirmidhi': 'at-Tirmidh\u012B',
    'al-Imam as-Suyuti': 'as-Suy\u016B\u1E6D\u012B',
    'at-Tabari': 'a\u1E6D-\u1E6Cabar\u012B',
    'adh-Dhahabi': 'adh-Dhahab\u012B',
  } as Record<string, string>,
  // Section headers for Explore tab
  SECTION_CATEGORIES: 'Topics',
  SECTION_GETTING_STARTED: 'Getting started',
  SECTION_FEATURED: 'Featured',
  SECTION_LONG_READS: 'Deep dives',
  SECTION_BEGINNER_FRIENDLY: 'Beginner friendly',
  SECTION_SHORT_READS: 'Quick reads',
  SECTION_ADVANCED: 'Advanced',
  // Difficulty levels
  DIFFICULTY_BEGINNER: 'Beginner',
  DIFFICULTY_INTERMEDIATE: 'Intermediate',
  DIFFICULTY_ADVANCED: 'Advanced',
  // Length categories
  LENGTH_SHORT: 'Short',
  LENGTH_MEDIUM: 'Medium',
  LENGTH_LONG: 'Long',
  RESUMED_READING_TEMPLATE: 'Resuming at {percent}%',
  // Article section headings (for progress-based sorting)
  CONTINUE_READING: 'Continue reading',
  MORE_FROM_AUTHOR: 'More from {author}',
  MORE_FROM_CATEGORY: 'More in {category}',
  SOURCE_BOOK: 'Source: {book}',
  UNREAD: 'Unread',
  COMPLETED: 'Completed',
  SET_TIME: 'Set time',
  // Article reader floating controls — icon-only, so these are their only accessible name
  ARTICLE_CLOSE_A11Y: 'Close article',
  ARTICLE_LISTEN_A11Y: 'Listen to this article',
  ARTICLE_STOP_LISTENING_A11Y: 'Stop listening',
  ARTICLE_ADD_TO_PLAYLIST_A11Y: 'Add to playlist',
  ARTICLE_REMOVE_FROM_PLAYLIST_A11Y: 'Remove from playlist',
  // Playlist tab empty state - one-tap quick start
  BOOKMARKS_EMPTY_TITLE: 'Nothing to play yet',
  BOOKMARKS_EMPTY_HINT:
    'Every article plays in English first, then Arabic. Tap the headphones on any article to add it here.',
  PLAYLIST_EMPTY_SEED_CTA: 'Add beginner articles',
  PLAYLIST_BILINGUAL_CAPTION: 'Plays English first, then Arabic',
  // Practice tab empty state - one-tap quick start
  START_REVIEW: 'Start review',
  PLAY_ALL: 'Play all',
  STUDY_LIST_EMPTY_TITLE: 'No words yet',
  STUDY_LIST_EMPTY_HINT:
    'Tap any word while reading and save it — reviews are scheduled so it sticks',
  PRACTICE_EMPTY_SEED_CTA: 'Add common words',
  BROWSE_ARTICLES: 'Browse articles',
  // Explore category/filter empty state
  CATEGORY_EMPTY_TITLE: 'No articles here yet',
  CATEGORY_EMPTY_HINT: 'New articles are added regularly — check back soon',
  // Welcome toasts when navigating from empty states
  EXPLORE_WELCOME_FROM_PLAYLIST: 'Tap the headphones on any article to add it to your playlist',
  // Success toasts for empty state actions
  WORDS_ADDED_SUCCESS: 'Ready for your first practice session',
  ARTICLES_ADDED_SUCCESS: 'Ready for your first listen',
  ERROR_LOADING_DATA: "Couldn't load data. " + tryAgain,
  // Success messages - encouraging and celebration-focused
  SESSION_COMPLETE: 'Session complete',
  // Completion screen educational text pools (teach SRS concepts based on session performance)
  SESSION_ED_STRONG_POOL: [
    "Strong recall means your intervals are growing. Some of these words won't need review for weeks.",
    "When you remember a word easily, the algorithm pushes the next review further out — that's how it becomes permanent.",
    'Your brain just proved it can retrieve these words under pressure. That act of retrieval is what builds long-term memory.',
    "Successful recall is more powerful than re-reading. You're training your brain to find these words when you need them.",
  ] as const,
  SESSION_ED_DEFAULT_POOL: [
    'A mix of known and forgotten is ideal. Struggling to recall makes the memory stronger than getting it right easily.',
    'Words you forgot will come back sooner. Words you knew get more time off. The system adapts to exactly where you are.',
    "Every word you couldn't recall is now scheduled for an earlier return. That's the algorithm protecting you from forgetting.",
    "Forgetting isn't failure — it's information. The system uses it to find the perfect moment for your next review.",
  ] as const,
  SESSION_ED_STRUGGLE_POOL: [
    'Difficult sessions build the strongest memories. Words you struggled with will get shorter intervals until they stick.',
    "Your brain is working hard, and that's exactly what learning looks like. These words will come back sooner for extra practice.",
    'The algorithm noticed these words need more repetition and will schedule more frequent reviews. That extra practice is what makes them stick.',
    "Every time you see a word again after forgetting, the memory trace gets deeper. You're building foundations right now.",
  ] as const,
  SESSION_ED_PERFECT:
    "Perfect session. The algorithm will space your next reviews further apart — you've earned longer breaks.",
  SESSION_ED_BIG_STABILITY_JUMP:
    'Your words grew significantly stronger this session. Some jumped from days to weeks between reviews.',
  // Recommendation engine message pools (forward-looking guidance for Practice tab)
  RECOMMENDATION_LOW_RETENTION_POOL: [
    'Forgetting is part of the process. Reviewing right at this difficulty point creates the strongest memories.',
    'Your brain builds stronger connections when you retrieve words right before forgetting. Now is the ideal time.',
    "Struggling to recall makes the next recall easier. Review now and you'll remember longer.",
  ] as const,
  RECOMMENDATION_DUE_MANY_POOL: [
    'Your words are at the perfect point for review — just starting to fade, which makes recall practice most effective.',
    'Each word is scheduled based on how well you know it. Harder words come back sooner, easier ones wait longer.',
    "Reviewing now extends each word's memory by days. The more times you successfully recall, the longer the next interval.",
  ] as const,
  RECOMMENDATION_DUE_FEW_POOL: [
    'A quick review now builds the habit. Consistency matters more than session size.',
    'Short sessions are just as effective as long ones. Every successful recall strengthens the memory trace.',
  ] as const,
  RECOMMENDATION_HEAVY_LOAD_POOL: [
    'Most of your words are still young memories. Let them mature through review before adding more — quality over quantity.',
    'Your brain has a daily learning budget. Focus on strengthening current words — new ones stick better when existing ones are solid.',
  ] as const,
  RECOMMENDATION_MODERATE_LOAD_POOL: [
    "Your vocabulary is growing steadily. A few more words won't overwhelm your schedule, but reviews always come first.",
    'More than half your words are approaching long-term memory. Each successful review roughly doubles the time until the next one.',
  ] as const,
  RECOMMENDATION_SMALL_CAUGHT_UP_POOL: [
    "Great time to explore articles and add words you're curious about. Words learned from context stick better than random lists.",
    'You have room for more words. The system handles the scheduling — you just need to find words that interest you.',
    "Each new word you add gets its own personalized schedule. Start with words you've seen in articles.",
  ] as const,
  RECOMMENDATION_BALANCED_POOL: [
    'Longer gaps between reviews mean your brain is encoding these more deeply.',
    'Your mastered words have growing review intervals. Each successful review pushes them even longer.',
    'No reviews right now means your words are consolidating — your brain is strengthening the connections in the background.',
  ] as const,
  RECOMMENDATION_BACKLOG_POOL: [
    'A big review queue means new words are paused for now. Sessions come in short chunks of your most urgent words — a few of them will clear it.',
    'Reviews come first: strengthening what you already know beats adding more. New words unlock as soon as your queue shrinks.',
  ] as const,
  METRIC_FIRST_SESSION_TODAY: 'First session today!',
  METRIC_WORDS_IMPROVING: (count: number) =>
    `${count} ${count === 1 ? 'word' : 'words'} strengthened`,
  ADDED_TO_BOOKMARKS: 'Added to playlist',
  REMOVED_FROM_BOOKMARKS: 'Removed from playlist',
  // Word action buttons
  ADD_TO_PRACTICE: 'Add to practice',
  REMOVE_FROM_PRACTICE: 'In practice',
  WORD_ADDED_TO_PRACTICE: 'Saved to practice',
  // Due-backlog intake gate (adding words blocked while reviews pile up)
  BACKLOG_CLEAR_REVIEWS_TOAST: 'Clear some reviews first — you have {count} words waiting',
  // Completion screen: next-chunk affordance for a large backlog
  REVIEW_MORE_TEMPLATE: 'Review {count} more',
  // Long-press quick save (toggle: long-press again to undo)
  WORD_QUICK_SAVED: 'Saved to practice — long-press to undo',
  WORD_QUICK_REMOVED: 'Removed from practice',
  CHECK_EMAIL_CONFIRMATION: 'Check your email to confirm',
  SUCCESS: 'Success',
  NEW_RECOMMENDATION_SELECTED: 'New recommendation',
  SELECTED_TO_HELP_PRACTICE_DUE: "Contains words you're practicing",
  CHOSEN_TO_REINFORCE_CHALLENGING: 'Helps reinforce challenging words',
  PERFECT_FOR_GETTING_STARTED: 'Great for getting started',
  RANDOMLY_SELECTED_FOR_DISCOVERY: 'Discover something new',
  // Auth - shortened and clearer
  CREATE_ACCOUNT: 'Create account',
  SIGN_IN: 'Sign in',
  SIGN_OUT: 'Sign out',
  ALREADY_HAVE_ACCOUNT: 'Already have an account?',
  DONT_HAVE_ACCOUNT: 'New to OpenArabic?',
  YOUR_EMAIL: 'Email',
  YOUR_PASSWORD: 'Password',
  SIGN_OUT_CONFIRMATION: 'Sign out of your account?',
  ENTER_VALID_EMAIL: 'Enter a valid email',
  ENTER_PASSWORD: 'Enter your password',
  PASSWORD_USE_AT_LEAST_TEMPLATE: 'Use at least {minLength} characters',
  FORGOT_PASSWORD: 'Forgot password?',
  RESET_PASSWORD_EMAIL_SENT: 'Check your email for a reset link',
  RESET_PASSWORD_ERROR: "Couldn't send reset email. Check your email address and try again",
  RESET_PASSWORD_VERIFYING: 'Verifying reset link…',
  RESET_PASSWORD_TITLE: 'Reset password',
  RESET_PASSWORD_SUBTITLE: 'Enter your new password below',
  RESET_PASSWORD_NEW_PLACEHOLDER: 'New password',
  RESET_PASSWORD_CONFIRM_PLACEHOLDER: 'Confirm new password',
  RESET_PASSWORD_BUTTON: 'Reset password',
  RESET_PASSWORD_CONFIRM_ERROR: 'Confirm your password',
  RESET_PASSWORD_MISMATCH: 'Passwords do not match',
  PASSWORD_STRENGTH_FAIR: 'Fair',
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
    'OpenArabic is an Arabic language learning platform. We provide articles, audio content, vocabulary tools, and spaced repetition learning features for learning Arabic.',
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
    'You own your learning data (reading progress, vocabulary lists, practice history). We collect and use this data as described in our Privacy Policy to provide and improve the service.',
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
    'We store your reading progress, vocabulary lists, practice session history, review performance, and app preferences (theme, audio settings, notifications).',
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
  PRIVACY_CONTACT_SUFFIX: ". We'll respond as soon as possible.",
  // Social auth
  SIGN_IN_WITH_APPLE: 'Sign in with Apple',
  SIGN_IN_WITH_GOOGLE: 'Sign in with Google',
  SIGN_IN_WITH_EMAIL: 'Sign in with email',
  CREATE_ACCOUNT_WITH_EMAIL: 'Create account with email',
  CONTINUE_WITH: 'or',
  MEMORY_STRENGTH: 'Memory strength',
  WORD_MASTERY: 'Mastered words',
  // Practice bottom sheet subtitles (concise: what it shows + why it matters)
  MEMORY_STRENGTH_SUBTITLE: "How much of your vocabulary you'd remember if quizzed right now",
  MEMORY_FORECAST_HINT: 'The line shows the week ahead if you don’t review',
  WORD_MASTERY_SUBTITLE: "Words you'll remember without review",
  DUE_WORDS_FORECAST_SUBTITLE: 'How many words come up for review each day',
  DUE_WORDS_FORECAST: 'This week',
  // Today hero card
  TODAY_ALL_CAUGHT_UP: 'All caught up',
  TODAY_TO_REVIEW: 'to review',
  TODAY_REVIEWED_TODAY: 'reviewed today',
  TODAY_NEXT_REVIEW: 'Next review',
  // Practice stat tiles
  MEMORY_LABEL: 'Memory',
  MASTERED_LOWER: 'mastered',
  // Chart bottom summaries
  SUMMARY_TODAY: 'Today',
  SUMMARY_IN_A_WEEK: 'In a week',
  SUMMARY_AT_RISK: 'At risk',
  SUMMARY_BUSIEST_DAY: 'Busiest day',
  SUMMARY_MASTERED: 'Mastered',
  SUMMARY_THIS_MONTH: 'This month',
  SUMMARY_WORDS_SUFFIX: 'words',
  NEWLY_DUE_SUFFIX: 'new',
  // Streak chart axis captions
  STREAK_CHART_START_LABEL: '40 days ago',
  STREAK_CHART_TODAY_LABEL: 'Today',
  // Study Streak
  STREAK_LABEL: 'Day streak',
  // Study Streak Bottom Sheet
  STUDY_STREAK_ACTIVE_SUBTITLE: 'Keep the momentum going',
  STUDY_STREAK_INACTIVE_SUBTITLE: 'Start your practice habit',
  STUDY_STREAK_CURRENT: 'Current',
  STUDY_STREAK_LONGEST: 'Longest',
  STUDY_STREAK_TOTAL: 'Total',
  STUDY_STREAK_CHART_TITLE: 'Last 40 days',
  STUDY_STREAK_CHART_DESCRIPTION: 'Each bar is a day you practiced',
  LOADING_STREAK: 'Loading streak…',
  FAILED_TO_LOAD_STREAK: "Couldn't load streak. Try again",
  STUDY_STREAK_EMPTY_STATE: 'Complete a review to start your streak',
  // Words to revisit (leeches)
  WORDS_TO_REVISIT: 'Words to revisit',
  REVISIT_LABEL: 'Revisit',
  WORDS_TO_REVISIT_SUBTITLE: 'The words you forget most — give them another pass',
  LOADING_WORDS_TO_REVISIT: 'Loading words…',
  FAILED_TO_LOAD_WORDS_TO_REVISIT: "Couldn't load words. Try again",
  WORDS_TO_REVISIT_EMPTY_STATE: 'Nothing tripping you up right now — nice work',
  FORGOT_N_TIMES: '{count}× forgot',
  RESET_WORD_PROGRESS: 'Reset progress?',
  RESET_WORD_PROGRESS_CONFIRM: 'This word starts over as new. Your other progress is kept.',
  WORD_PROGRESS_RESET: 'Progress reset',
  FAILED_TO_RESET_WORD_PROGRESS: "Couldn't reset progress. Try again",
  RESET_WORD_PROGRESS_A11Y: 'Reset progress for this word',
  // Dictionary (All words) list
  SEARCH_WORDS: 'Search words',
  SORT_DIFFICULTY: 'Difficulty',
  SORT_STRENGTH: 'Strength',
  SORT_RECENT: 'Recent',
  WORD_COUNT_ONE: '1 word',
  WORD_COUNT_OTHER: '{count} words',
  NO_WORDS_MATCH_SEARCH: 'No words match your search',
  // Practice word detail sheet
  WORD_STAT_STRENGTH: 'Strength',
  WORD_STAT_DIFFICULTY: 'Difficulty',
  WORD_STAT_NEXT_REVIEW: 'Next review',
  WORD_STRENGTH_WEAK: 'Weak',
  WORD_STRENGTH_MEDIUM: 'Medium',
  WORD_STRENGTH_STRONG: 'Strong',
  WORD_DIFFICULTY_EASY: 'Easy',
  WORD_DIFFICULTY_MODERATE: 'Moderate',
  WORD_DIFFICULTY_HARD: 'Hard',
  WORD_DUE_NOW: 'Due now',
  WORD_DUE_TOMORROW: 'Tomorrow',
  WORD_DUE_IN_DAYS: 'In {count} days',
  WORD_STATE_NEW: 'New',
  WORD_EXAMPLES_TITLE: 'In articles',
  RESET_PROGRESS_ACTION: 'Reset progress',
  REMOVE_FROM_PRACTICE_ACTION: 'Remove from practice',
  REMOVE_WORD_TITLE: 'Remove word?',
  REMOVE_WORD_CONFIRM: 'The word and its review progress are removed from practice.',
  REMOVE: 'Remove',
  // Chart Empty States (action + outcome, concise)
  EMPTY_STATE_MASTERY: 'Add words to see your strength trend',
  EMPTY_STATE_LEARNED: 'Complete reviews to track your progress',
  EMPTY_STATE_EFFICIENCY: 'Add words to track your learning speed',
  EMPTY_STATE_RETRIEVABILITY: 'Add words to see your review timing',
  EMPTY_STATE_DUE_WORDS: 'Add words to see your upcoming reviews',
  EMPTY_STATE_GENERAL: 'Add words to start tracking your progress',
  // Word Sentences Bottom Sheet (dictionary sentence examples)
  NO_SENTENCE_EXAMPLES: 'No sentence examples yet',
  PLAY_AUDIO: 'Play audio',
  // Chart Dynamic Message Suffixes (concatenated with numbers)
  WORDS_NEED_URGENT_REVIEW: '% due for review',
  WORDS_LIKELY_FORGOTTEN: ' words due for review',
  // Account - Support section
  HELP_CENTER: 'Help center',
  CONTACT_SUPPORT: 'Contact support',
  NO_EMAIL: 'No email',
  BYTE_UNITS: ['Bytes', 'KB', 'MB', 'GB'] as const,
  ERROR_PRIORITY_QUEUE_LENGTH_MISMATCH: 'Items and priorities arrays must have the same length',
  // Cache management - clearer and more actionable
  CLEAR_CACHE: 'Clear cache',
  CLEAR_CACHE_BUTTON: 'Clear cache',
  NO_CACHE: 'No cache',
  NO_CACHED_FILES: 'Nothing to clear',
  CLEAR_CACHE_CONFIRMATION:
    'This removes {size} of cached audio, articles, and app data. Everything reloads when needed.',
  CLEAR_CACHE_SUCCESS: 'Cache cleared',
  // Reading progress management
  RESET_READING_PROGRESS: 'Reset reading progress',
  THIS_WILL_DELETE_ALL_READING_PROGRESS:
    'Permanently deletes all reading positions and progress. This cannot be undone.',
  READING_PROGRESS_RESET_SUCCESSFULLY: 'Reading progress reset',
  FAILED_TO_RESET_READING_PROGRESS: "Couldn't reset reading progress. " + tryAgain,
  // Notifications
  ENABLE_NOTIFICATIONS: 'Enable notifications',
  TURN_ON_NOTIFICATIONS:
    'Notifications are off for OpenArabic. Turn them on in system settings to get review reminders.',
  OPEN_SETTINGS: 'Open settings',
  NOTIFICATIONS_DISABLED: 'Notifications disabled',
  // Notification permission priming (review completion screen)
  NOTIFICATION_PRIMING_TITLE: 'Catch words before they fade',
  NOTIFICATION_PRIMING_BODY:
    "Each word you just practiced is now on its own forgetting curve. We'll nudge you only when a review actually matters — usually just before words start to fade.",
  NOTIFICATION_PRIMING_ACCEPT: 'Turn on reminders',
  NOTIFICATION_PRIMING_DECLINE: 'Not now',
  // Smart reminder notifications (selection logic in utils/notificationCopy.ts)
  NOTIFICATION_DUE_TITLE_POOL: [
    'Your words are ready',
    'Right on time for review',
    'A few words are due',
    'Your review window is open',
    'Time for a short review',
  ] as const,
  NOTIFICATION_DUE_FEW_BODY_POOL: [
    (count: number) =>
      `Just ${count} ${count === 1 ? 'word' : 'words'} today. A minute of recall keeps ${count === 1 ? 'it' : 'them'} moving toward long-term memory.`,
    (count: number) =>
      `${count} ${count === 1 ? 'word is' : 'words are'} at the ideal recall point. Short sessions count the same as long ones.`,
    (count: number) =>
      `${count} ${count === 1 ? 'word is' : 'words are'} starting to fade. Reviewing now resets ${count === 1 ? 'its' : 'their'} clock for days.`,
    (count: number) =>
      `A light day — ${count} ${count === 1 ? 'word' : 'words'}, about a minute. Consistency is what builds the memory.`,
  ] as const,
  NOTIFICATION_DUE_MANY_BODY_POOL: [
    (count: number) =>
      `${count} words have reached their review point. Recalling them now is when memory strengthens most.`,
    (count: number) =>
      `${count} words are due — each successful recall pushes its next review further out.`,
    (count: number) =>
      `${count} words, all timed for today. A session now catches them at the right moment.`,
    (count: number) =>
      `Your ${count} due words are just starting to fade — the sweet spot for recall practice.`,
  ] as const,
  NOTIFICATION_SLIPPING_TITLE_POOL: [
    'Some words are fading',
    'Catch them before they go',
    'A few words are slipping',
    'Worth a short rescue',
  ] as const,
  NOTIFICATION_SLIPPING_BODY_POOL: [
    (count: number) =>
      `${count} ${count === 1 ? 'word is' : 'words are'} close to the forgetting point. One pass brings ${count === 1 ? 'it' : 'them'} back to full strength.`,
    (count: number) =>
      `Memory fades on a curve — ${count} of your words ${count === 1 ? 'is' : 'are'} near the drop. A short review flattens it.`,
    (count: number) =>
      `${count} ${count === 1 ? 'word' : 'words'} you worked for ${count === 1 ? 'is' : 'are'} slipping. Recalling ${count === 1 ? 'it' : 'them'} now builds the strongest trace.`,
    (count: number) =>
      `${count} ${count === 1 ? 'word is' : 'words are'} below ${count === 1 ? 'its' : 'their'} usual strength. ${count === 1 ? 'It comes' : 'They come'} back fastest if you review today.`,
  ] as const,
  NOTIFICATION_WORD_TITLE_POOL: [
    (word: string) => `Remember ${word}?`,
    (word: string) => `${word} is starting to fade`,
    (word: string) => `Still know ${word}?`,
    (word: string) => `A moment for ${word}`,
  ] as const,
  NOTIFICATION_WORD_BODY_POOL: [
    (word: string, _others: number) =>
      `${word} is nearing its forgetting point. Recalling it now roughly doubles how long it lasts.`,
    (word: string, _others: number) =>
      `If the meaning of ${word} just surfaced, that was retrieval — the exact practice that makes it stick.`,
    (word: string, others: number) =>
      others > 0
        ? `${word} and ${others} more are due. Reviewing at this moment is when the memory strengthens most.`
        : `${word} is due. Reviewing at this moment is when the memory strengthens most.`,
    (word: string, _others: number) =>
      `You've been building ${word} for a while — this is the review that locks it in for longer.`,
  ] as const,
  START_REVIEWING_TO_BUILD_STRENGTH: 'Practice to see your memory strength',
  STUDY_TO_MONITOR_REVIEW_TIMING: 'Practice to see your review schedule',
  STUDY_WORDS_TO_TRACK_MEMORY_RETENTION: 'Practice to track your retention',
  ALL_WORDS_LOOK_STABLE: 'All words look stable',
  RECOMMENDED: 'Recommended',
  // Error messages - actionable with next steps
  ERROR: 'Error',
  UNKNOWN_ERROR_OCCURRED: 'Something unexpected happened',
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
  PLAYING_ARABIC_ONLY_THIS_SESSION: 'Playing Arabic-only for this session',
  FAILED_TO_STOP_AUDIO_ON_CLOSE: "Couldn't stop audio on close. " + tryAgain,
  // Playlist errors
  FAILED_TO_LOAD_BOOKMARKS: "Couldn't load playlist. " + tryAgain,
  FAILED_TO_ADD_TO_READING_LIST: "Couldn't add to playlist. " + tryAgain,
  FAILED_TO_REMOVE_FROM_READING_LIST: "Couldn't remove from playlist. " + tryAgain,
  FAILED_TO_CHECK_READING_LIST_STATUS: "Couldn't check playlist. " + tryAgain,
  ERROR_UPDATING_STUDY_LIST: "Couldn't update practice list. " + tryAgain,
  FAILED_TO_LOAD_STUDY_WORDS: "Couldn't load practice words. " + tryAgain,
  FAILED_TO_UPDATE_WORD_AND_REVIEW: "Couldn't save review. " + tryAgain,
  FAILED_TO_TOGGLE_STUDY_WORD: "Couldn't update word. " + tryAgain,
  FAILED_TO_ADD_COMMON_WORDS: "Couldn't add words. " + tryAgain,
  FAILED_TO_ADD_BEGINNER_ARTICLES: "Couldn't add articles. " + tryAgain,
  FAILED_TO_DELETE_WORD: "Couldn't delete word. " + tryAgain,
  FAILED_TO_LOAD_ALL_ROOTS: "Couldn't load roots. " + tryAgain,
  FAILED_TO_DELETE_STUDY_WORDS: "Couldn't delete practice words. " + tryAgain,
  FAILED_TO_LOAD_PRACTICE_DATA: "Couldn't load practice data. " + tryAgain,
  FAILED_TO_LOAD_SENTENCES: "Couldn't load sentences. " + tryAgain,
  // Timer errors
  FAILED_TO_START_SLEEP_TIMER: "Couldn't start timer. " + tryAgain,
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
    'Vocabulary practice lists and progress',
    'Playlist articles',
    'App preferences and settings',
  ] as const,
  DELETE_ACCOUNT_PERMANENT: 'This action cannot be undone.',
  DELETE_ACCOUNT_SIGNED_IN_AS: 'Signed in as:',
  DELETE_ACCOUNT_ENTER_CONFIRMATION: 'Type DELETE to confirm:',
  DELETE_ACCOUNT_CONFIRMATION_PLACEHOLDER: 'Type DELETE to confirm',
  DELETE_ACCOUNT_CONFIRMATION_WORD: 'DELETE',
  DELETE_ACCOUNT_CONFIRMATION_MISMATCH: 'Type DELETE exactly as shown',
  DELETE_ACCOUNT_SUCCESS: 'Account deleted',
  FAILED_TO_DELETE_ACCOUNT: "Couldn't delete account. " + tryAgain,
  ACCOUNT_DELETION_IN_PROGRESS: 'Deleting account…',
  // Sign-in requirements - clearer and shorter
  PLEASE_SIGN_IN_TO_ADD_WORDS: 'Sign in to add words',
  PLEASE_SIGN_IN_TO_ADD_ROOTS: 'Sign in to add roots',
  ERROR_EMPTY_EMAIL: 'Enter your email address',
  HELP_SEARCH_PLACEHOLDER: 'Search help articles',
  HELP_SEARCH_RESULTS_SINGULAR: 'result',
  HELP_SEARCH_RESULTS_PLURAL: 'results',
  HELP_NO_RESULTS_TITLE: 'No results found',
  HELP_NO_RESULTS_DESCRIPTION: 'Try different keywords or clear your search to browse all topics',
  HELP_POPULAR_QUESTIONS: 'Popular questions',
  HELP_STILL_NEED_HELP_TITLE: 'Still need help?',
  HELP_STILL_NEED_HELP_DESCRIPTION: 'We typically respond within 24 hours',
  // Chart empty states
  CHART_EMPTY_STATE: 'Add words to see your progress chart',
  // Legal & Attributions
  LEGAL_ATTRIBUTIONS: 'Legal & attributions',
  LEGAL_INTRO:
    'OpenArabic is built with open source projects and third-party services. Thanks to all developers who make their work freely available.',
  LEGAL_AUDIO_TITLE: 'Audio generation',
  LEGAL_AUDIO_ELEVENLABS: 'ElevenLabs',
  LEGAL_AUDIO_ELEVENLABS_DESC: 'Text-to-speech API for high-quality Arabic and English audio',
  LEGAL_AUDIO_ELEVENLABS_URL: 'https://elevenlabs.io',
  LEGAL_ERROR_TRACKING_TITLE: 'Error tracking',
  LEGAL_ERROR_SENTRY: 'Sentry',
  LEGAL_ERROR_SENTRY_DESC: 'Error monitoring and crash reporting for app stability',
  LEGAL_ERROR_SENTRY_URL: 'https://sentry.io',
  LEGAL_FONTS_TITLE: 'Typefaces',
  LEGAL_FONTS_ARABIC_TITLE: 'Arabic fonts',
  LEGAL_FONTS_ENGLISH_TITLE: 'English fonts',
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
    'English text uses system fonts (SF Pro on iOS, Roboto on Android) for a native feel.',
  LEGAL_OPEN_SOURCE_TITLE: 'Open source libraries',
  LEGAL_OPEN_SOURCE_DESC:
    'Built with React Native, Expo, and many open source libraries. Full license details in the app repository.',
  LEGAL_LICENSE_INFO: 'License information',
  LEGAL_SIL_OFL_TITLE: 'SIL Open Font License 1.1',
  LEGAL_SIL_OFL_DESC:
    'Fonts under SIL OFL are free to use, modify, and distribute. Full text at scripts.sil.org/OFL',
} as const;
