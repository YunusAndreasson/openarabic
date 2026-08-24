// Helper functions for consistent messaging
const tryAgain = 'Try again';
export const STRINGS = {
  // Common actions
  CANCEL: 'Cancel',
  RETRY: 'Retry',
  RESET: 'Reset',
  CLEAR: 'Clear',
  REFRESH: 'Refresh',
  CONTINUE: 'Continue',
  // Settings & preferences
  STUDY_REMINDERS: 'Review reminders',
  SMART_REMINDERS_SUBTITLE: 'Sent when words are due',
  REMINDER_TIME: 'Time',
  THEME: 'Theme',
  // The row shows the plain mode; the poetic names live in the picker, where
  // there is room for them. From a row alone, "Birches in Spring" never told
  // you whether you were about to go light or dark.
  THEME_MODE_LIGHT: 'Light',
  THEME_MODE_DARK: 'Dark',
  THEME_MODE_SEPIA: 'Sepia',
  THEME_SUBTITLE_LIGHT: 'Light',
  THEME_SUBTITLE_DARK: 'Dark',
  THEME_SUBTITLE_SEPIA: 'Sepia',
  // "Arabic font" undersold the row: it opens face *and* reading size, and the
  // size is the setting people actually come looking for.
  ARABIC_FONT: 'Arabic text',
  ARABIC_TEXT_VALUE: '{font} · {size}',
  FONT_SIZE: 'Font size',
  // Shared bilingual label
  BILINGUAL_LABEL: 'English + Arabic',
  AUDIO_LANGUAGE: 'Audio language',
  AUDIO_LANGUAGE_ARABIC: 'Arabic only',
  AUDIO_LANGUAGE_ARABIC_SUBTITLE: 'For more fluent listeners',
  AUDIO_LANGUAGE_BILINGUAL_SUBTITLE: 'Hear English first to prepare for Arabic',
  AUDIO_SHUFFLE: 'Shuffle',
  HAPTICS: 'Haptic feedback',
  // Voice grading
  // The subtitle already says "the English meaning"; the label need not.
  SPEAK_ANSWER: 'Speak the answer',
  SPEAK_ANSWER_IDLE_SUBTITLE: 'Answer out loud instead of tapping',
  SPEAK_ANSWER_DOWNLOADING_SUBTITLE: 'Downloading voice model… {pct}%',
  SPEAK_ANSWER_READY_SUBTITLE: 'Ready. Uses 100 MB on device',
  SPEAK_ANSWER_ERROR_SUBTITLE: "Couldn't load voice model. Try again later.",
  /** A full disk is not a transient fault, so it must not be reported as one.
   *  "Try again later" is advice that can never work — waiting frees nothing —
   *  and it was what the learner saw. Name the number they need. */
  SPEAK_ANSWER_NO_SPACE_SUBTITLE: 'Needs about 250 MB free to set up voice',
  SPEAK_ANSWER_WAITING_WIFI_SUBTITLE: 'Waiting for Wi-Fi to download the voice model',
  // Voice control. Two rules decide every string here, and there are only four
  // of them left:
  //
  //   the BUTTON names the action available — it has exactly two labels
  //   the CARD carries the state — and mostly shows it rather than saying it
  //
  // The button used to report the pipeline: "Preparing voice…", "Listen…",
  // "Opening mic…", "Listening…", "Grading…", "Voice paused", "Microphone is
  // off" — seven labels on one control, changing up to five times per answer,
  // each one explaining something the learner never asked about. States that
  // mean the mic cannot be used (paused, refused, still downloading) now hide
  // the button outright instead of naming themselves: an offer that isn't there
  // needs no excuse.
  /** Resting label. The mic opens when the learner says so, never on a timer —
   *  the pause before answering IS the retrieval, so they own when it ends.
   *  Names the action ("Speak"), not the gesture ("Tap") — every button on
   *  this screen is tapped, so saying so here is the one thing this label
   *  does NOT need to say; what it needs to say is what happens next. */
  VOICE_SPEAK_TO_ANSWER: 'Speak to answer',
  /** While the mic is live. An action, not a state: "Listening…" belongs on the
   *  card, where a meter that moves with the voice already says it. */
  VOICE_DONE_SPEAKING: 'Done',
  /** Under the card's live meter. The meter carries "we can hear you"; this
   *  names it once for anyone who needs the word (and for a screen reader). */
  VOICE_LISTENING: 'Listening…',
  /** The one beat the meter cannot narrate: bars frozen with no caption reads
   *  as a hang. */
  VOICE_CHECKING: 'Grading…',
  VOICE_CHANNEL_LABEL: 'Voice answer',
  /** The model is still arriving. This slot used to render NOTHING at all —
   *  the button was hidden outright, so a learner who had just switched voice
   *  on saw no trace of it and no reason why. A download is temporary and
   *  explainable, which is exactly the case where saying so beats hiding. */
  /** VISIBLE label, and it has to fit HALF a row beside "Show answer" — the
   *  fuller "Preparing voice… 62%" clipped to "Preparing voice… 6.." on a Pixel.
   *  The word "voice" is carried by the accessibility label below instead,
   *  where there is no width budget to blow. */
  VOICE_PREPARING_TEMPLATE: (pct: number) => `Preparing… ${pct}%`,
  /** Same wait, no number: once the bytes are down and only the recognizer is
   *  still building there is no percentage worth quoting, and "100%" next to a
   *  disabled button reads as a stall rather than as progress. */
  VOICE_PREPARING: 'Preparing…',
  /** Spoken form — says what is being prepared, which the short label cannot. */
  VOICE_PREPARING_A11Y: 'Preparing voice answer',
  /** Wi-Fi-gated by design: 100 MB on someone's cellular plan without asking is
   *  not a trade we make for them. Naming the size makes the offer honest. */
  VOICE_WAITING_WIFI: 'Voice needs Wi-Fi',
  VOICE_DOWNLOAD_ON_CELLULAR: 'Download over cellular (100 MB)',
  VOICE_MODEL_RETRY: 'Retry voice setup',
  /** Shown once the OS has refused the mic. Distinct from the download states
   *  on purpose: waiting fixes one of these and cannot fix the other. */
  VOICE_ENABLE_MICROPHONE: 'Enable microphone',
  VOICE_MIC_PERMISSION_DENIED: 'Microphone access is off. Voice grading disabled.',
  /** Replaces the old copy's second sentence. Denial no longer turns the
   *  feature off, so promising that it did was both wrong and discouraging. */
  VOICE_MIC_PERMISSION_BLOCKED: 'Microphone access is off. Turn it on to answer out loud.',
  /** The review header's close button — icon-only, so it needs a spoken name.
   *  It is the only control up there; the mic that used to sit beside it (with
   *  its pause / resume / preparing / offer labels) is gone, because the bottom
   *  band's "Speak to answer" is the only thing that opens the mic. */
  REVIEW_CLOSE_A11Y: 'End review session',
  // Voice result panel — shown when the recognizer couldn't confirm a match.
  // Framed as a neutral self-grade ("did you get it right?") rather than a
  // verdict, so the buttons answer the question the transcript sets up instead
  // of asking the user to ratify the ASR. The answer half of that comparison is
  // no longer here: it is on the card, under the Arabic, at the size the answer
  // face gives it — a caption in the action band was the wrong home for the one
  // word the learner had just failed to recall.
  VOICE_RESULT_NOT_HEARD: "Didn't catch that",
  VOICE_RESULT_HEARD_TEMPLATE: (heard: string) => `You said “${heard}”`,
  // Long forms stay as the accessibility labels: the visible buttons are
  // abbreviated to sit three-up in the same band as the self-grade row, but a
  // screen reader has no such constraint and "Got it" alone is ambiguous.
  VOICE_RESULT_ACCEPT: 'Yes, I got it',
  VOICE_RESULT_REJECT: 'No, I missed it',
  VOICE_RESULT_RETRY: 'Try again',
  VOICE_RESULT_ACCEPT_SHORT: 'Got it',
  VOICE_RESULT_REJECT_SHORT: 'Missed it',
  // Shown when the phonetic near-miss path credits an answer the transcript got
  // wrong ("Please" for "place"). Names what was heard so the pass never looks
  // like the app mishearing in the learner's favour without saying so.
  VOICE_NEAR_MATCH_TEMPLATE: (heard: string) => `Heard “${heard}” — counted it`,
  // Reveal-first self-grade (shown after the card flips to its answer)
  SHOW_ANSWER: 'Show answer',
  PLAY_SENTENCE_AUDIO: 'Play sentence',
  REPLAY_WORD_AUDIO: 'Replay word',
  // Solo button in its row, filled/primary like "Show answer" alone — "Tap to"
  // was naming the gesture every button already asks for.
  RESTUDY_CONTINUE: 'Continue',
  RECALL_RUN: (count: number) => `${count} in a row`,
  // Says out loud what the bar can only draw: how far into this sitting you are,
  // and how many words the whole session has actually put behind you.
  SESSION_PROGRESS_A11Y: (percent: number, done: number) =>
    `${percent}% through this round, ${done} words done`,
  GRADE_FORGOT: 'Forgot',
  GRADE_GUESSED: 'Guessed',
  GRADE_KNEW_IT: 'Knew it',
  NO_TRANSLATION_AVAILABLE: 'No translation available',
  // Advanced (Account → Advanced) — voice grading diagnostics
  ADVANCED_VOICE_GRADING: 'Voice grading',
  ADVANCED_VOICE_GRADING_SUBTITLE: 'Model status and recording options',
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
  ADVANCED_MODEL_WAITING_WIFI: 'Waiting for Wi-Fi',
  /** Nothing in the app deleted the ~100 MB before this, and there was no UI to
   *  reclaim it. Tolerable while voice was opt-in and four people had it; not
   *  once it ships on by default. */
  ADVANCED_MODEL_REMOVE: 'Remove voice model',
  ADVANCED_MODEL_REMOVE_CONFIRM_TITLE: 'Remove voice model?',
  ADVANCED_MODEL_REMOVE_CONFIRM_BODY:
    'Frees about 100 MB and turns off speaking answers. Turn it back on in Practice settings to download it again.',
  ADVANCED_ENERGY_GATE: 'Energy gate',
  ADVANCED_ENERGY_GATE_SUBTITLE: 'Auto-stop on trailing silence',
  ADVANCED_GAIN_NORM: 'Gain normalization',
  ADVANCED_GAIN_NORM_SUBTITLE: 'Peak-normalize audio before grading',
  ADVANCED_IOS_RAW: 'iOS raw mode',
  ADVANCED_IOS_RAW_SUBTITLE: "'measurement' mode — no AGC / noise processing",
  ADVANCED_DEBUG_HUD: 'Voice debug HUD',
  ADVANCED_DEBUG_HUD_SUBTITLE: 'Show what was heard + recorder stats in review',
  DAILY_WORD_LIMIT: 'New words per day',
  DAILY_LIMIT_LOW: '10 words',
  DAILY_LIMIT_LOW_SUBTITLE: 'Recommended',
  DAILY_LIMIT_MEDIUM: '20 words',
  DAILY_LIMIT_MEDIUM_SUBTITLE: 'A faster pace',
  DAILY_LIMIT_HIGH: '30 words',
  DAILY_LIMIT_HIGH_SUBTITLE: 'More reviews to keep up with',
  DAILY_LIMIT_UNLIMITED: 'Unlimited',
  DAILY_LIMIT_UNLIMITED_SUBTITLE: 'Reviews can pile up quickly',
  DAILY_LIMIT_REACHED: 'Daily limit reached. You can increase it in Account settings.',
  /** Same message when a finite limit is set, so the number can be named. */
  DAILY_LIMIT_REACHED_COUNT:
    'Daily limit of {count} words reached. You can increase it in Account settings.',
  /** Summary value on the Daily-word-limit row for a finite limit. */
  DAILY_LIMIT_WORDS_COUNT: '{count} words',
  DAILY_LIMIT_PAUSED_LOW_RECALL:
    'New words are paused until your recall improves. Keep reviewing and they’ll resume.',
  // The row's right-hand value already states the limit, so the subtitle only
  // has to report today's standing, and say why it is zero when adaptive pacing
  // has paused new words — which "0 remaining" never did.
  DAILY_LIMIT_LEFT_TODAY: '{count} left today',
  DAILY_LIMIT_PAUSED_SHORT: 'Paused until your recall improves',
  ADAPTIVE_PACING: 'Adaptive pacing',
  ADAPTIVE_PACING_SUBTITLE: 'Pauses new words when your recall drops',
  WORD_TAP_PREVIEW: 'Word preview',
  WORD_TAP_PREVIEW_SUBTITLE: 'Show a popup instead of the full word card',
  RESET_TUTORIALS: 'Show tutorials again',
  RESET_TUTORIALS_SUBTITLE: 'Resets the intro tips and checklist',
  RESET_TUTORIALS_TITLE: 'Reset tutorials?',
  RESET_TUTORIALS_MESSAGE: 'Tips will show again as you use the app.',
  RESET_TUTORIALS_FAILED: 'Failed to reset tutorials',
  // Tutorial copy
  TUTORIAL_WORD_TAP_CTA: 'Tap the highlighted word to see its meaning — then add it to practice',
  // Review tutorial - Intro
  TUTORIAL_INTRO_TITLE: 'How it works',
  TUTORIAL_INTRO_DESCRIPTION: 'Tap a card to reveal the answer, then say how well you knew it.',
  // Review tutorial - the three grades. The LABELS are not duplicated here on
  // purpose: the step reuses GRADE_FORGOT / GRADE_GUESSED / GRADE_KNEW_IT, the
  // same strings ReviewGradeBar renders, so the tutorial cannot drift from the
  // screen it is explaining (it previously taught a binary swipe for a ternary
  // grade bar, and never mentioned "Guessed" at all).
  TUTORIAL_GRADES_TITLE: 'Three answers',
  TUTORIAL_GRADES_BODY: 'Once the answer is showing, tap the one that matches how it went.',
  TUTORIAL_GRADE_FORGOT_HINT: 'Stays for another look, then comes back soon',
  TUTORIAL_GRADE_GUESSED_HINT: 'Comes back sooner than the ones you knew',
  TUTORIAL_GRADE_KNEW_HINT: 'Comes back later, so you skip easy words',
  // Review tutorial - Ready step
  TUTORIAL_SRS_TITLE: "You're ready",
  TUTORIAL_SRS_DESCRIPTION: 'Rate honestly. We adapt to you.',
  TUTORIAL_SRS_CTA: 'Start',
  // Review tutorial navigation
  TUTORIAL_NEXT: 'Next',
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
  FEEDBACK_SCREENSHOT_REMOVE_A11Y: 'Remove screenshot',
  FEEDBACK_SENDING: 'Sending…',
  FEEDBACK_SUBMIT: 'Send feedback',
  // Account section titles - now imported directly from enums in components
  ACCOUNT: 'Account',
  ACCOUNT_A11Y_OPEN: 'Open account',
  ACCOUNT_A11Y_CHANGE_PHOTO: 'Change profile photo',
  PLAYLIST_A11Y_REORDER: 'Reorder track',
  PLAYLIST_A11Y_REORDER_HINT: 'Press and hold, then drag to move this track',
  // Sections are named for where a setting takes effect, not for what it is
  // made of — a reader looking for the font size looks under "Reading", not
  // under "Appearance". Sentence case throughout.
  READING_SECTION: 'Reading',
  PRACTICE_SECTION: 'Practice',
  // Answers the question the pace settings otherwise raise: "where do I set my
  // review interval?" You don't — FSRS does.
  PRACTICE_SECTION_SUBTITLE: 'Review scheduling is automatic',
  LISTENING_SECTION: 'Listening',
  // Carried on the section so neither row below has to spell out its scope.
  LISTENING_SECTION_SUBTITLE: 'Applies to article audio and playlists',
  APP_SECTION: 'App',
  HELP_SECTION: 'Help',
  ABOUT_SECTION: 'About',
  // "Start fresh with all articles" read like a feature. It deletes every
  // reading position, so it says so.
  RESET_READING_PROGRESS_DESCRIPTION: "Clears every article's reading position",
  DELETE_ACCOUNT_DESCRIPTION: 'Permanently remove your account and data',
  // Social Media
  FOLLOW_US: 'Follow OpenArabic',
  TWITTER: 'X',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  TWITTER_URL: 'https://x.com/openarabicio',
  INSTAGRAM_URL: 'https://www.instagram.com/openarabic.io/',
  FACEBOOK_URL: 'https://www.facebook.com/OpenArabic.io/',
  // A single quiet credit, now a row inside About rather than a section of its
  // own. The byline links to Yunus's projects page, which lists his other apps,
  // so this app doesn't have to.
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
  // Onboarding — welcome intro (shown once after first sign-in).
  // Deliberately NOT the auth screen's Read/Tap/Listen triad again — these three
  // teach the loop the app is built on (read → save → review), which nothing else
  // in the first run explains.
  ONBOARDING_STEP_READ_TITLE: 'Read without decoding',
  ONBOARDING_STEP_READ_BODY:
    "Every text is classical Arabic with the English above each line — you're never stuck on a sentence.",
  ONBOARDING_STEP_SAVE_TITLE: 'Keep the words you meet',
  ONBOARDING_STEP_SAVE_BODY:
    'Tap a word for its meaning, or long-press to save it straight to practice.',
  ONBOARDING_STEP_REVIEW_TITLE: 'They come back on time',
  ONBOARDING_STEP_REVIEW_BODY:
    "Saved words return for review just before you'd forget them. A few minutes a day is enough.",
  // Fourth slide: how to review, not what reviewing is. Names the one thing a
  // learner cannot work out alone — that grading yourself after seeing the
  // answer measures a feeling, and speaking measures the recall. Awareness
  // only; the slide never asks, downloads, or flips the setting.
  ONBOARDING_STEP_SPEAK_TITLE: 'Answer out loud',
  ONBOARDING_STEP_SPEAK_BODY:
    'Tapping "Knew it" grades a feeling. Speaking grades the recall, and that harder retrieval is what makes a word stick.',
  ONBOARDING_NEXT: 'Next',
  ONBOARDING_SKIP: 'Skip',
  ONBOARDING_CTA: 'Open your first text',
  // Onboarding — Get started checklist on Explore
  CHECKLIST_TITLE: 'Get started',
  CHECKLIST_PROGRESS: '{done} of {total}',
  CHECKLIST_READ: 'Read your first text',
  CHECKLIST_SAVE: 'Save a word to practice',
  CHECKLIST_LISTEN: 'Listen to bilingual audio',
  CHECKLIST_PRACTICE: 'Practice your first word',
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
  /**
   * The hardest-words rail on Explore.
   *
   * "Hardest right now" rather than "Words to revisit": the Practice sheet of
   * that name is the full, ranked list and this is a swipeable slice of its top,
   * so the two must not read as the same thing sitting on two tabs.
   *
   * **No subtitle.** It had one — "The words you keep forgetting" — and every
   * card underneath already says "N× forgot" against a word the learner saved.
   * A line of prose restating the row beneath it is the kind of text that reads
   * as filler on the second viewing and never earns its space again.
   */
  SECTION_HARDEST_WORDS: 'Hardest right now',
  // Difficulty levels
  // Length categories
  RESUMED_READING_TEMPLATE: 'Resuming at {percent}%',
  // Article section headings (for progress-based sorting)
  CONTINUE_READING: 'Continue reading',
  MORE_FROM_AUTHOR: 'More from {author}',
  MORE_FROM_CATEGORY: 'More in {category}',
  SOURCE_BOOK: 'Source: {book}',
  UNREAD: 'Unread',
  COMPLETED: 'Completed',
  SET_TIME: 'Set time',
  // Header buttons are icon-only, so these are their only accessible name
  CLOSE_A11Y: 'Close',
  DICTIONARY_A11Y: 'Your words',
  EDIT_MODE_START_A11Y: 'Edit list',
  EDIT_MODE_DONE_A11Y: 'Done editing',
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
  // Practice tab empty state - one-tap quick start
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
  // Long-press quick save (toggle: long-press again to undo)
  WORD_QUICK_SAVED: 'Saved to practice — long-press to undo',
  WORD_QUICK_REMOVED: 'Removed from practice',
  CHECK_EMAIL_CONFIRMATION: 'Check your email to confirm',
  SUCCESS: 'Success',
  SELECTED_TO_HELP_PRACTICE_DUE: "Contains words you're practicing",
  CHOSEN_TO_REINFORCE_CHALLENGING: 'Helps reinforce challenging words',
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
  NO_INTERNET_CONNECTION: 'No internet connection. Check your connection and try again.',
  PASSWORD_USE_AT_LEAST_TEMPLATE: 'Use at least {minLength} characters',
  SHOW_PASSWORD: 'Show password',
  HIDE_PASSWORD: 'Hide password',
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
  PRIVACY_THIRD_PARTY_META: 'Meta (Facebook)',
  PRIVACY_THIRD_PARTY_META_DESC:
    'If you installed Open Arabic from a Facebook or Instagram ad, we share a small number of app events with Meta — that the app was opened, an account was created, the intro was finished, or a practice session was completed — so we can tell whether an ad was worth running. We do not send Meta your name, email, or what you study. On iOS we never ask to track you across other apps, so Meta only receives this in aggregate. On Android your device advertising ID is included; you can reset or limit it in Settings → Privacy → Ads.',
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
  // Memory horizon sheet — the breakdown one tap under the practice hero.
  //
  // It answers the card's own drawing: the constellation bins practised words by
  // how long they hold, and this sheet lists those same bands with their counts
  // and a way into the words. It deliberately does NOT restate the hero's number
  // as a percentage — that was the old gauge, and Σ R over N is the hero count
  // divided by its own denominator, not a detail of it.
  MEMORY_HORIZON_TITLE: 'Memory horizon',
  /**
   * Says "practised" for the same reason the hero does: a word waiting for its
   * first review has no memory state, so it has no horizon either. It is counted
   * separately, under MEMORY_HORIZON_NOT_STARTED.
   */
  MEMORY_HORIZON_SUBTITLE: 'How long each practised word holds before it needs you again',
  /**
   * The definition, stated once, in the one place with room for it. `stability`
   * IS the days until predicted recall falls to `request_retention` (0.90) — so
   * this sentence is the maths, not a metaphor for it.
   */
  MEMORY_HORIZON_EXPLAINER:
    'A horizon is how long a word holds before recall drops to 90%. Every review you get right pushes it further out.',
  /** Tags the band the median word falls in — the hero's "typical", made locatable. */
  MEMORY_HORIZON_TYPICAL_TAG: 'typical',
  MEMORY_HORIZON_NOT_STARTED: 'Not started',
  /**
   * NOT the same caption as `DEPTH_BAND_HINT_NONE`, deliberately, because it is
   * not the same set of words. `horizon-none` is "no measurable horizon", which
   * also catches a practised word whose stability never landed; `depth-none` is
   * strictly `fsrs_reps === 0` (see `useDictionaryList`). They were both reading
   * "saved, never reviewed", so two rows in two sheets gave the identical reason
   * for two different counts — which reads as a bug rather than as the honest
   * distinction it is.
   */
  MEMORY_HORIZON_NOT_STARTED_HINT: 'no horizon yet',
  MEMORY_HORIZON_EMPTY: 'Nothing practised yet — your first review puts a word on this axis',
  /** Plain-language span per band, so a label never has to be decoded. */
  HORIZON_BAND_HINT_DAYS: 'under a week',
  HORIZON_BAND_HINT_WEEKS: 'a week to a month',
  HORIZON_BAND_HINT_MONTHS: 'a month to a year',
  HORIZON_BAND_HINT_YEAR: 'over a year',
  /**
   * Shared by BOTH breakdown sheets, because they draw the same row and differ
   * only in what goes in `{clause}`.
   *
   * `{clause}` is a whole clause, not the visible caption. A horizon caption
   * reads as a fragment under its label ("under a week") and only the band rows
   * can have "holds" put in front of it — "Not started" describes why a word has
   * no horizon at all, so it supplies its own, or VoiceOver said "holds saved,
   * never reviewed". A depth caption is already a full phrase, so it goes in
   * unchanged.
   */
  BREAKDOWN_ROW_A11Y: '{band}, {count} words, {clause}. Opens them in your dictionary.',
  BREAKDOWN_ROW_A11Y_EMPTY: '{band}, no words, {clause}.',
  HORIZON_ROW_HOLDS_A11Y: 'holds {hint}',
  // Review-depth sheet — the breakdown one tap under the "Reviews done" tile.
  //
  // It answers the tile's own number: `Σ fsrs_reps` is grades given, and this
  // sheet says where those grades went. It deliberately does NOT draw a bar per
  // day, however obvious that detail view is for a review count: `study_words`
  // holds current FSRS state only and `fsrs_last_review` is overwritten by every
  // review, so a per-day series would be invented rather than measured. See
  // `utils/practiceDepth`.
  REVIEW_DEPTH_TITLE: 'Reviews done',
  REVIEW_DEPTH_SUBTITLE: 'Every grade you have given, and where the effort went',
  /** Three readings of one quantity, so all three are counts of reviews. */
  DEPTH_METRIC_TOTAL: 'Total',
  DEPTH_METRIC_PER_DAY: 'Per study day',
  /** Reviews ÷ EVERY saved word, matching the rows below, which partition all of them. */
  DEPTH_METRIC_PER_WORD: 'Per word',
  /** Marks a mean, so it cannot be read as one of the exact counts beside it. */
  DEPTH_AVERAGE: '≈{count}',
  /**
   * A real but sub-unit mean. `≈0` beside a Total of `1` reads as a
   * contradiction rather than as an average, and that is exactly the first-week
   * case — one review spread over three study days — where the sheet is meant to
   * be encouraging. An inequality claims no precision it does not have.
   */
  DEPTH_AVERAGE_UNDER_ONE: '<1',
  /** Bands by rep count. The label IS the range — see DEPTH_BAND_HINT_* below. */
  DEPTH_BAND_DEEP: '10+ times',
  DEPTH_BAND_SOLID: '5–9 times',
  DEPTH_BAND_FEW: '2–4 times',
  DEPTH_BAND_ONCE: 'Once',
  DEPTH_BAND_NONE: 'Not yet',
  /**
   * What the band MEANS. The opposite of HORIZON_BAND_HINT_*, which have to
   * spell out a span because "Weeks" does not: "5–9 times" already has, so
   * repeating the range here would spend a caption line saying nothing.
   */
  DEPTH_BAND_HINT_DEEP: 'your most drilled words',
  DEPTH_BAND_HINT_SOLID: 'coming back reliably',
  DEPTH_BAND_HINT_FEW: 'still bedding in',
  DEPTH_BAND_HINT_ONCE: 'one pass so far',
  DEPTH_BAND_HINT_NONE: 'saved, never reviewed',
  /**
   * The reason depth is worth showing at all, stated once: FSRS grows a word's
   * stability on every successful review, so the count is not a tally of effort
   * but the thing that bought the interval.
   */
  /**
   * States the mechanism WITHOUT pointing at a position in the list. It used to
   * say "the words highest on this list", which was true only while the bands
   * ran most-drilled first — so the copy silently encoded the row order, and
   * bound itself to break the moment that order was made to match the memory
   * sheet's. Say what a review does; let the rows show where each word is.
   */
  DEPTH_EXPLAINER:
    'Every pass you get right pushes a word further out, so the most-reviewed words are the ones that now ask least of you.',
  DEPTH_EMPTY: 'Nothing reviewed yet — your first session fills this in',
  DUE_WORDS_FORECAST_SUBTITLE: 'How many words come up for review each day',
  DUE_WORDS_FORECAST: 'This week',
  // Week-ahead card
  TODAY_ALL_CAUGHT_UP: 'All caught up',
  TODAY_TO_REVIEW: 'to review today',
  /**
   * Says "words", not just "reviewed today", because the number counts unique
   * WORDS whose last review was today — re-asking the same word inside a session
   * does not add to it. Without the noun this sat beside a "Reviews done" tile
   * and the screen used "review" for two different units.
   *
   * `{words}` is filled by `formatWordCount`, so the noun agrees with the
   * number. Concatenating the count onto a fixed "words reviewed today" printed
   * "1 words reviewed today" on every learner's first day.
   */
  TODAY_REVIEWED_TODAY: '{words} reviewed today',
  // Memory horizon hero
  /**
   * Conditional mood on purpose: this is an expectation summed over forgetting
   * curves, not a tally of things the learner has done. Same voice as
   * MEMORY_STRENGTH_SUBTITLE, which the sheet one tap deeper uses.
   */
  PRACTICE_RECALL_NOW_LABEL: "Words you'd recall right now",
  /** Names the population the estimate is over, so it is never read as a grade. */
  PRACTICE_RECALL_OF_TOTAL: 'of {total} practised',
  /**
   * Nothing reviewed yet. NOT "0" — that claims total loss where there is simply
   * no measurement.
   */
  PRACTICE_RECALL_EMPTY: 'Nothing measured yet — your first review starts it',
  /**
   * The median, and the copy says so. "Typical" rather than "average" because the
   * maths is a median: stability is heavily right-skewed, and a mean sits where
   * no real word does. If this ever reads "average", the maths must change too.
   */
  PRACTICE_TYPICAL_HORIZON: 'Typical word holds for {horizon}',
  PRACTICE_SLIPPING_NOW: '{count} slipping',
  PRACTICE_NOTHING_SLIPPING: 'Nothing slipping',
  PRACTICE_SLIPPING_WEEK: '{count} more slip this week',
  PRACTICE_NOTHING_SLIPPING_WEEK: 'Nothing else slips this week',
  /** Shown only when a dot stops being one word, so the scale is never silent. */
  PRACTICE_DOT_SCALE: 'each dot is {count} words',
  // Memory horizon bands — deliberately the units formatHorizon rounds to, so a
  // band label can never contradict a word's own detail screen.
  HORIZON_BAND_DAYS: 'Days',
  HORIZON_BAND_WEEKS: 'Weeks',
  HORIZON_BAND_MONTHS: 'Months',
  HORIZON_BAND_YEAR: 'A year+',
  HORIZON_BAND_COUNT_A11Y: '{count} for {band}',
  HORIZON_BAND_A11Y:
    'Memory horizon. You can recall about {recall} of {total} practised words right now. {breakdown}. Opens the breakdown by band.',
  HORIZON_BAND_A11Y_EMPTY: 'Memory horizon. Nothing practised yet. Opens the breakdown by band.',
  WEEK_AHEAD_A11Y:
    'Reviews this week. {today} due today, {peak} at the busiest. Opens the weekly forecast.',
  /**
   * Two variants because this card has two homes. On the dictionary it IS the
   * dictionary, so promising to open one is wrong; only the (currently unused)
   * pressable placement navigates anywhere.
   */
  VOCABULARY_GROWTH_A11Y: '{count} words in practice.',
  VOCABULARY_GROWTH_A11Y_LINK: '{count} words in practice. Opens your dictionary.',
  // Practice stat tiles
  /** Grades given, not words seen — distinct from "words reviewed today" above. */
  REVIEWS_LABEL: 'Reviews done',
  /**
   * What each habit tile says out loud.
   *
   * A tile that reads only "Day streak, 43" gives a screen-reader user the
   * number and hides the door — the same gap the chevron closes visually. These
   * end the way the hero's and the week-ahead card's labels already do, with
   * what the tap opens, so every pressable panel on the screen announces itself
   * the same way.
   */
  STREAK_TILE_A11Y: 'Day streak, {count}. Opens your practice history.',
  STREAK_TILE_A11Y_EMPTY: 'Day streak, not loaded yet. Opens your practice history.',
  REVIEWS_TILE_A11Y:
    'Reviews done, {count}. Opens the breakdown by how often each word has come up.',
  REVISIT_TILE_A11Y: '{count} words to revisit. Opens the words you forget most.',
  /** Stat-tile placeholder for a metric with nothing to measure yet. */
  EMPTY_METRIC: '—',
  VOCABULARY_GROWTH_LABEL: 'Words in practice',
  // Chart bottom summaries
  SUMMARY_TODAY: 'Today',
  SUMMARY_BUSIEST_DAY: 'Busiest day',
  SUMMARY_THIS_MONTH: 'This month',
  SUMMARY_WORDS_SUFFIX: 'words',
  WORD_SINGULAR: 'word',
  NEWLY_DUE_SUFFIX: 'new',
  REVIEW_CTA_PREFIX: 'Review',
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
  /**
   * The streak sheet's closing caption. It used to be the subtitle of a SECOND
   * `BottomSheetHeader` mid-sheet, whose title read "Last 40 days" directly above
   * a chart already captioned "40 days ago … Today" — so the title restated its
   * own drawing and the sheet was the only one in the tab with two headers.
   */
  STUDY_STREAK_CHART_DESCRIPTION: 'Each bar is a day you practised',
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
  /**
   * One card in the Explore rail, read out whole — and it reads out exactly what
   * is drawn, which is the headword and its meaning.
   *
   * It used to end "Opens the word." A label should say what the thing IS; that
   * it can be opened is the job of `accessibilityRole="button"`, which the card
   * now sets, and a screen reader already announces. Saying both means every
   * card in the rail reads its own affordance out loud. It also used to carry
   * the forgot-count, which the card no longer shows.
   */
  HARDEST_WORD_CARD_A11Y: '{arabic}, {meaning}',
  /**
   * The terminal "see all" card on the Explore rail (`WordRail`'s
   * `SeeAllCard`). Deliberately its own string, NOT
   * `WORDS_TO_REVISIT_SEE_ALL_A11Y`: that one claims "Opens them in your
   * dictionary", which is true for the words-to-revisit sheet's own overflow
   * row but not for this card — `HardestWordsSection` sends it to the
   * words-to-revisit sheet instead, so the dictionary claim would be wrong.
   */
  HARDEST_WORDS_SEE_ALL_A11Y: 'See all {count} words to revisit.',
  /**
   * The overflow out of the capped leech list and into the dictionary.
   *
   * Only rendered when the list actually truncated. A row offering to "see all"
   * the twenty words already on screen would be the drill-down that leads back
   * to what you just read — the same mistake the old retention gauge made under
   * the memory hero.
   */
  WORDS_TO_REVISIT_SEE_ALL: 'See all {count}',
  WORDS_TO_REVISIT_SEE_ALL_HINT: 'the hardest {shown} are listed above',
  WORDS_TO_REVISIT_SEE_ALL_A11Y: 'See all {count} words to revisit. Opens them in your dictionary.',
  RESET_WORD_PROGRESS: 'Reset progress?',
  RESET_WORD_PROGRESS_CONFIRM: 'This word starts over as new. Your other progress is kept.',
  WORD_PROGRESS_RESET: 'Progress reset',
  FAILED_TO_RESET_WORD_PROGRESS: "Couldn't reset progress. Try again",
  // Dictionary (the learner's saved words) list
  /**
   * Title of the saved-word list. Deliberately NOT "All words": that is also
   * SCOPE_ALL below, so arriving from a horizon band put "All Words" in the
   * header above twelve filtered words. "Your words" is the one thing that is
   * true of the screen under every scope, and it is the distinction that
   * matters — these are the learner's, not the corpus lexicon behind them.
   */
  PRACTICE_WORDS_TITLE: 'Your words',
  SEARCH_WORDS: 'Search words',
  SORT_DIFFICULTY: 'Difficulty',
  SORT_STRENGTH: 'Strength',
  SORT_RECENT: 'Recent',
  /** Names the dictionary sort group for screen readers. */
  SORT_BY_A11Y: 'Sort by',
  WORD_COUNT_ONE: '1 word',
  WORD_COUNT_OTHER: '{count} words',
  NO_WORDS_MATCH_SEARCH: 'No words match your search',
  /**
   * Spoken, never drawn. Age is the one value the row's meter draws that the
   * row does not otherwise say: difficulty and horizon are true of the word
   * whichever sort is active, so they are always announced, while age is a
   * property of the list's current ORDER and is only worth saying while it is
   * the thing being measured.
   */
  WORD_ADDED_AGO_A11Y: 'added {age} ago',
  WORD_ADDED_TODAY_A11Y: 'added today',
  // Dictionary scope filter — names what the list is currently showing
  FILTER_WORDS_A11Y: 'Filter words',
  SCOPE_PICKER_TITLE: 'Show',
  SCOPE_ALL: 'All words',
  SCOPE_DUE: 'Due now',
  SCOPE_STRUGGLING: 'Struggling',
  SCOPE_MASTERED: 'Mastered',
  /** Prefixes the word count while a scope is active, e.g. "Due now · 24 words". */
  SCOPE_COUNT_TEMPLATE: '{scope} · {count}',
  SCOPE_EMPTY_DUE: 'Nothing due right now',
  SCOPE_EMPTY_STRUGGLING: 'Nothing tripping you up right now',
  SCOPE_EMPTY_MASTERED: 'No mastered words yet — keep reviewing',
  /**
   * Horizon scopes. Reachable only from the memory sheet, never from the scope
   * picker — that picker is four full-height option cards inside a
   * dynamically-sized bottom sheet, and five more would overflow a small phone
   * with no scroll. They still live in the same `scope` union so the list can
   * only ever be under one filter, and so the sort bar's existing count line
   * names it without a second filter mechanism on screen.
   *
   * "Holds for", not the bare band label: on the practice card "Weeks" sits on a
   * time axis that says what it means, and in a list of words it would not.
   */
  SCOPE_HORIZON_DAYS: 'Holds for days',
  SCOPE_HORIZON_WEEKS: 'Holds for weeks',
  SCOPE_HORIZON_MONTHS: 'Holds for months',
  SCOPE_HORIZON_YEAR: 'Holds for a year+',
  SCOPE_HORIZON_NONE: 'Not started',
  SCOPE_EMPTY_HORIZON: 'No words hold for that long yet',
  SCOPE_EMPTY_HORIZON_NONE: 'Every word has a review behind it',
  /**
   * Depth scopes. Reached from the review-depth sheet, on the same terms as the
   * horizon scopes above. These spell "Reviewed" out where the sheet's row says
   * a bare "5–9 times": under that row's own heading the unit is obvious, and
   * on a filtered word list it would not be.
   */
  SCOPE_DEPTH_DEEP: 'Reviewed 10+ times',
  SCOPE_DEPTH_SOLID: 'Reviewed 5–9 times',
  SCOPE_DEPTH_FEW: 'Reviewed 2–4 times',
  SCOPE_DEPTH_ONCE: 'Reviewed once',
  SCOPE_DEPTH_NONE: 'Never reviewed',
  SCOPE_EMPTY_DEPTH: 'No words have been reviewed that often yet',
  SCOPE_EMPTY_DEPTH_NONE: 'Every word has at least one review',
  /** The filter arrived from another screen, so it says how to leave. */
  CLEAR_FILTER_A11Y: 'Clear filter, show all words',
  SHOW_ALL_WORDS: 'Show all words',
  // Practice word detail — memory panel
  WORD_MEMORY_TITLE: 'Memory',
  /** Stage · horizon, e.g. "Familiar · holds for 3 weeks". */
  WORD_MEMORY_SUMMARY: '{stage} · holds for {horizon}',
  WORD_STAGE_LEARNING: 'Learning',
  WORD_STAGE_FAMILIAR: 'Familiar',
  WORD_STAGE_MASTERED: 'Mastered',
  WORD_NOT_PRACTISED: "You haven't practised this word yet",
  WORD_HORIZON_DAY_ONE: '1 day',
  WORD_HORIZON_DAYS: '{count} days',
  WORD_HORIZON_WEEK_ONE: '1 week',
  WORD_HORIZON_WEEKS: '{count} weeks',
  WORD_HORIZON_MONTH_ONE: '1 month',
  WORD_HORIZON_MONTHS: '{count} months',
  WORD_HORIZON_YEAR: 'over a year',
  /** Reads on the row as "Memory · holds for 3 weeks" for screen readers. */
  WORD_HORIZON_A11Y: 'memory holds for {horizon}',
  WORD_HORIZON_A11Y_NONE: 'not practised yet',
  /** Sits opposite the stage/horizon under the forgetting curve. */
  WORD_RECALL_NOW: '{percent}% now',
  /** Names the curve for screen readers, which cannot see a drawing. */
  WORD_MEMORY_CURVE_A11Y:
    'Forgetting curve. Recall is {percent} percent now and the next review is {due}.',
  // Practice word detail sheet
  WORD_STAT_DIFFICULTY: 'Difficulty',
  WORD_STAT_NEXT_REVIEW: 'Next review',
  /** Feedforward: what a successful recall would buy, before you spend it. */
  WORD_STAT_NEXT_GAIN: 'Recall it again',
  WORD_STAT_NEXT_GAIN_VALUE: '→ {horizon}',
  WORD_STAT_REVIEWS: 'Reviews',
  WORD_REVIEWS_VALUE: '{count}',
  WORD_REVIEWS_WITH_LAPSES: '{count} · {lapses} forgotten',
  WORD_DIFFICULTY_EASY: 'Easy',
  WORD_DIFFICULTY_MODERATE: 'Moderate',
  WORD_DIFFICULTY_HARD: 'Hard',
  WORD_DUE_NOW: 'Due now',
  WORD_DUE_LATER_TODAY: 'Later today',
  WORD_DUE_TOMORROW: 'Tomorrow',
  WORD_DUE_IN_DAYS: 'In {count} days',
  WORD_STATE_NEW: 'New',
  WORD_EXAMPLES_TITLE: 'In articles',
  /**
   * Spoken label for an example block that opens its source article. The title
   * is drawn above the sentence, so sighted readers already have it; this is
   * what makes the whole block announce itself as one link rather than as a
   * loose title beside an unrelated line of Arabic.
   */
  WORD_EXAMPLE_OPEN_A11Y: 'Read this sentence in {title}',
  /**
   * The forms the corpus actually shows this word in — the dictionary only ever
   * held the lemma. "Seen as" rather than "Forms": it is a report of what the
   * learner has read, not a conjugation table, and the app has no such table.
   */
  WORD_FORMS_TITLE: 'Seen as',
  // Practice word detail / reader sheet — root explanation
  /**
   * Names the concept, not the jargon. "Root" alone is a term a beginner has to
   * already own; this states what the section is for, and the radicals directly
   * beneath it are then self-evidently the thing it refers to.
   */
  WORD_ROOT_SECTION_TITLE: 'Where this word comes from',
  /** Transliteration and shared sense, under the radicals. */
  WORD_ROOT_SUMMARY: '{transliteration} · {meaning}',
  WORD_ROOT_SENSES_TITLE: 'Senses',
  /**
   * "Words from this root", not "Related words": relatedness is a vaguer claim
   * that a thesaurus also satisfies. The whole point of the section is that
   * these share a derivation.
   */
  WORD_ROOT_FAMILY_TITLE: 'Words from this root',
  /**
   * Prefixes the broken plural on a family row. Written as the bare
   * lexicographic abbreviation rather than "Plural:" because it sits inline
   * beside Arabic script on a phone-width row, where a full word costs more of
   * the line than it explains — and "pl." is the form a learner meets in every
   * dictionary they will use after this one.
   */
  WORD_ROOT_PLURAL: 'pl.',
  /**
   * Attribution. "Synthesised from" rather than "From": the text is generated
   * against Lane's as grounding, not quoted from it, and claiming otherwise
   * would borrow an authority the sentence has not earned.
   */
  WORD_ROOT_SOURCE: 'Synthesised from {source}',
  /**
   * Spoken form of the root line. Screen readers announce spaced radicals one
   * letter at a time with no indication of what they are, so the label says it.
   */
  WORD_ROOT_A11Y: 'Root {root}, meaning {meaning}',

  /**
   * Names the SCOPE of the grammar note, which is the whole reason it sits
   * beside the root block: this one is about the word as it appears in the
   * sentence being read, while "Where this word comes from" is about the
   * dictionary entry behind it. Unlabelled, the two read as two opinions on the
   * same thing.
   */
  WORD_SENTENCE_NOTE_TITLE: 'In this sentence',
  /** Fallback title only. The screen sets the word's own meaning once it has it. */
  WORD_DETAIL_TITLE: 'Word',
  /** Shown when the word list has loaded but this word is no longer in it —
   *  e.g. it was removed from another screen. Beats spinning forever. */
  WORD_NOT_FOUND: 'This word is no longer in your practice list',
  /**
   * The root-level word sheet (`/word-detail`), opened from the Explore rail.
   *
   * It reports on a word the learner has already saved, so a root that is not in
   * the practice list is a genuine miss — the same one the practice word screen
   * reports, in the same words, because they are the same claim.
   */
  WORD_SHEET_LOADING: 'Loading word…',
  WORD_SHEET_ERROR: "Couldn't load this word. Try again",
  /**
   * The route is reachable by a real external deep link
   * (`open-arabic:///word-detail`), unlike the practice word screen, which is
   * only ever pushed with a known-good id. A missing or malformed `rootId`
   * query param is a broken link, not a word that used to be saved — telling
   * the learner it left their practice list would blame them for a link that
   * never carried a valid id in the first place.
   */
  WORD_SHEET_INVALID_LINK: "This link isn't valid",
  /**
   * The way out of the sheet and into everything it does not carry — the
   * inflected forms, the example sentences, reset and remove. Named for the
   * destination rather than the action ("Open full details") because it lands on
   * another tab, and a row that changes tabs should say where it is going.
   */
  WORD_SHEET_OPEN_IN_DICTIONARY: 'Open in your dictionary',
  WORD_SHEET_OPEN_IN_DICTIONARY_A11Y: 'Open {word} in your dictionary',
  RESET_PROGRESS_ACTION: 'Reset progress',
  REMOVE_FROM_PRACTICE_ACTION: 'Remove from practice',
  REMOVE_WORD_TITLE: 'Remove word?',
  REMOVE_WORD_CONFIRM: 'The word and its review progress are removed from practice.',
  REMOVE: 'Remove',
  // Chart Empty States (action + outcome, concise)
  EMPTY_STATE_DUE_WORDS: 'Add words to see your upcoming reviews',
  // Word Sentences Bottom Sheet (dictionary sentence examples)
  NO_SENTENCE_EXAMPLES: 'No sentence examples yet',
  PLAY_AUDIO: 'Play audio',
  // Account - Support section
  HELP_CENTER: 'Help center',
  CONTACT_SUPPORT: 'Contact support',
  NO_EMAIL: 'No email',
  ACCOUNT_MEMBER_SINCE: 'Member since {date}',
  BYTE_UNITS: ['Bytes', 'KB', 'MB', 'GB'] as const,
  ERROR_PRIORITY_QUEUE_LENGTH_MISMATCH: 'Items and priorities arrays must have the same length',
  // Cache management - clearer and more actionable
  CLEAR_CACHE: 'Clear cache',
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
  // Notification permission priming (review completion screen)
  NOTIFICATION_PRIMING_TITLE: 'Catch words before they fade',
  NOTIFICATION_PRIMING_BODY:
    "Each word you just practised is now on its own forgetting curve. We'll nudge you only when a review actually matters — usually just before words start to fade.",
  NOTIFICATION_PRIMING_ACCEPT: 'Turn on reminders',
  NOTIFICATION_PRIMING_DECLINE: 'Not now',
  // Speak-the-answer priming (practice screen). The download size is stated in
  // the ask on purpose — an undisclosed 100 MB download is how you lose trust.
  VOICE_PRIMING_TITLE: 'Practice out loud',
  // Says the useful thing and stops. Practice is self-graded, so the real pitch
  // is that speaking is harder to fake than tapping "Knew it"; the size and the
  // on-device fact are what a learner needs to decide. No em-dashes, no
  // "entirely", no third sentence restating the second.
  VOICE_PRIMING_BODY:
    'Say answers out loud instead of tapping. Harder to fool yourself, and you practice pronunciation. Runs on your device, 100 MB.',
  VOICE_PRIMING_ACCEPT: 'Turn it on',
  VOICE_PRIMING_DECLINE: 'No thanks',
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
  RECOMMENDED: 'Recommended',
  // Error messages - actionable with next steps
  ERROR: 'Error',
  UNKNOWN_ERROR_OCCURRED: 'Something unexpected happened',
  SIGN_IN_FAILED: 'Sign in failed',
  ACCOUNT_CREATION_FAILED: 'Account creation failed',
  REFRESH_FAILED: 'Refresh failed',
  FAILED_TO_LOAD_ARTICLES: "Couldn't load articles. " + tryAgain,
  FAILED_TO_LOAD_ARTICLE: "Couldn't load article. " + tryAgain,
  /**
   * The reader is reachable by a real external deep link (`open-arabic:///article/[id]`).
   * Same distinction as `WORD_SHEET_INVALID_LINK`/`WORD_NOT_FOUND`: a malformed
   * or missing id is a broken link, never a real article; a well-formed id that
   * doesn't resolve is a genuine miss. Screen has `headerShown: false`, so this
   * is the only way out other than the Android back gesture.
   */
  ARTICLE_INVALID_LINK: "This link isn't valid",
  ARTICLE_NOT_FOUND: 'Article not found',
  ARTICLE_NOT_FOUND_HINT: 'It may have been removed, or the link may be broken.',
  ARTICLE_NOT_FOUND_GO_BACK: 'Go back',
  FAILED_TO_LOAD_FILTER_OPTIONS: "Couldn't load filters. " + tryAgain,
  FAILED_TO_LOAD_AUTHORS: "Couldn't load authors. " + tryAgain,
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
  HELP_SEARCH_CLEAR: 'Clear search',
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
