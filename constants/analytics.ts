/**
 * Analytics Constants
 * Mixpanel configuration and event names
 */

// Your Mixpanel project token - required for analytics to work
export const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

// Analytics token - gracefully handled by analytics service

// Analytics event names - keep consistent across the app
export const ANALYTICS_EVENTS = {
  // Authentication events
  SIGN_IN: 'Sign In',
  SIGN_UP: 'Sign Up',
  SIGN_OUT: 'Sign Out',

  // App lifecycle events
  APP_OPENED: 'App Opened',
  APP_BACKGROUNDED: 'App Backgrounded',
  APP_RESUMED: 'App Resumed',

  // Review/Practice session events
  REVIEW_SESSION_STARTED: 'Review Session Started',
  REVIEW_SESSION_ABANDONED: 'Review Session Abandoned',
  REVIEW_WORD_GRADED: 'Review Word Graded',
  PRACTICE_SESSION_COMPLETE: 'Practice Session Complete',

  // Audio playback events
  AUDIO_PLAY_ALL_STARTED: 'Audio Play All Started',
  AUDIO_PLAYBACK_STARTED: 'Audio Playback Started',
  AUDIO_PLAYBACK_COMPLETED: 'Audio Playback Completed',
  AUDIO_PLAYBACK_PAUSED: 'Audio Playback Paused',
  SLEEP_TIMER_SET: 'Sleep Timer Set',

  // Article/Reading events
  ARTICLE_VIEWED: 'Article Viewed',
  ARTICLE_BOOKMARKED: 'Article Bookmarked',

  // Vocabulary/Study events
  WORD_ADDED_TO_STUDY: 'Word Added to Study',
  WORD_REMOVED_FROM_STUDY: 'Word Removed from Study',
  WORD_LONG_PRESS_SAVE: 'Word Long Press Save',
  COMMON_WORDS_ADDED: 'Common Words Added',
  BEGINNER_ARTICLES_ADDED: 'Beginner Articles Added',

  // Onboarding events
  ONBOARDING_INTRO_VIEWED: 'Onboarding Intro Viewed',
  ONBOARDING_INTRO_STEP_VIEWED: 'Onboarding Intro Step Viewed',
  ONBOARDING_INTRO_COMPLETED: 'Onboarding Intro Completed',
  ONBOARDING_INTRO_SKIPPED: 'Onboarding Intro Skipped',
  ONBOARDING_CHECKLIST_SHOWN: 'Onboarding Checklist Shown',
  ONBOARDING_CHECKLIST_ITEM_TAPPED: 'Onboarding Checklist Item Tapped',
  ONBOARDING_CHECKLIST_ITEM_COMPLETED: 'Onboarding Checklist Item Completed',
  ONBOARDING_CHECKLIST_COMPLETED: 'Onboarding Checklist Completed',
  ONBOARDING_CHECKLIST_SUPPRESSED: 'Onboarding Checklist Suppressed',

  // Navigation events
  SCREEN_VIEWED: 'Screen Viewed',

  // Account events
  ACCOUNT_DELETED: 'Account Deleted',

  // Error tracking events
  ERROR_OCCURRED: 'Error Occurred',

  // Notification events
  NOTIFICATION_SCHEDULING_FAILED: 'Notification Scheduling Failed',
  NOTIFICATIONS_DROPPED: 'Notifications Dropped',

  // Voice grading (Parakeet ASR) events
  VOICE_MODEL_LOAD_STARTED: 'Voice Model Load Started',
  VOICE_MODEL_READY: 'Voice Model Ready',
  VOICE_MODEL_FAILED: 'Voice Model Failed',
  VOICE_ARM: 'Voice Arm',
  VOICE_MIC_DENIED: 'Voice Mic Denied',
  VOICE_TRANSCRIPT: 'Voice Transcript',
  VOICE_MATCH: 'Voice Match',
} as const;

// User property keys for identify calls
