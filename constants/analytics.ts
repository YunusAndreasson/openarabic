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

  // Account events
  ACCOUNT_DELETED: 'Account Deleted',

  // Error tracking events

  // Notification events
  NOTIFICATION_SCHEDULING_FAILED: 'Notification Scheduling Failed',
  NOTIFICATIONS_DROPPED: 'Notifications Dropped',
  SMART_REMINDERS_SYNCED: 'Smart Reminders Synced',
  SMART_REMINDER_OPENED: 'Smart Reminder Opened',
  SMART_REMINDERS_TOGGLED: 'Smart Reminders Toggled',
  NOTIFICATION_PRIMING_SHOWN: 'Notification Priming Shown',
  NOTIFICATION_PRIMING_ACCEPTED: 'Notification Priming Accepted',
  NOTIFICATION_PRIMING_DECLINED: 'Notification Priming Declined',
  VOICE_PRIMING_SHOWN: 'Voice Priming Shown',
  VOICE_PRIMING_ACCEPTED: 'Voice Priming Accepted',
  VOICE_PRIMING_DECLINED: 'Voice Priming Declined',
  NOTIFICATION_PERMISSION_RESULT: 'Notification Permission Result',
  REMINDER_SCHEDULING_ERROR: 'Reminder_Scheduling_Error',
  BACKGROUND_TASK_ERROR: 'Background_Task_Error',

  // Voice grading (Parakeet ASR) events
  VOICE_MODEL_LOAD_STARTED: 'Voice Model Load Started',
  VOICE_MODEL_READY: 'Voice Model Ready',
  VOICE_MODEL_FAILED: 'Voice Model Failed',
  VOICE_ARM: 'Voice Arm',
  VOICE_MIC_DENIED: 'Voice Mic Denied',
  VOICE_TRANSCRIPT: 'Voice Transcript',
  VOICE_MATCH: 'Voice Match',
} as const;

/**
 * Meta (Facebook) app event names, used only for ad attribution in Ads Manager.
 *
 * These are the raw wire names rather than `AppEventsLogger.AppEvents.*` so this
 * file stays free of native imports — constants are pulled into tests and Expo Go,
 * where the Facebook SDK is not linked.
 *
 * `fb_mobile_activate_app` (install / launch) is NOT listed: the native SDK logs it
 * automatically via `autoLogAppEventsEnabled` in app.json. Only events we raise
 * ourselves belong here.
 *
 * Keep this list short. Every event here is data shared with Meta, so add one only
 * when it is genuinely needed to judge whether an ad is paying for itself.
 */
export const META_EVENTS = {
  /** Account created — the top of the funnel an install ad is actually buying. */
  COMPLETED_REGISTRATION: 'fb_mobile_complete_registration',
  /** Finished the welcome intro — separates real users from bounced installs. */
  COMPLETED_TUTORIAL: 'fb_mobile_tutorial_completion',
  /** Custom: finished a practice session — the best available proxy for retention. */
  PRACTICE_SESSION_COMPLETE: 'PracticeSessionComplete',
} as const;

// User property keys for identify calls
