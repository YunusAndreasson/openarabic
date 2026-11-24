/**
 * Analytics Constants
 * Mixpanel configuration and event names
 */

declare const __DEV__: boolean | undefined;

/**
 * The Mixpanel project token; without it analytics is a silent no-op.
 *
 * Dev builds (Metro, `__DEV__`) get none, so a developer's installs never land in
 * the production project, where marketer counts every First Open as a real
 * install. Set EXPO_PUBLIC_MIXPANEL_IN_DEV=1 to send from a dev build on purpose.
 */
const isDevBuild = typeof __DEV__ !== 'undefined' && __DEV__;
export const MIXPANEL_TOKEN =
  isDevBuild && process.env.EXPO_PUBLIC_MIXPANEL_IN_DEV !== '1'
    ? undefined
    : process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

// Analytics event names - keep consistent across the app
export const ANALYTICS_EVENTS = {
  // Authentication events
  SIGN_IN: 'Sign In',
  SIGN_UP: 'Sign Up',
  SIGN_OUT: 'Sign Out',
  /** A sign-in or sign-up that did not end signed in. `code` is a machine code, never the message. */
  AUTH_FAILED: 'Auth Failed',

  // App lifecycle events
  /** A launch the learner sees: never sent while the app runs in the background. */
  APP_OPENED: 'App Opened',
  /**
   * Once per install, at the first App Opened; `install_kind` is new or existing.
   * A contract with the system that reads it (services/installAttribution): never rename it.
   */
  FIRST_OPEN: 'First Open',
  APP_BACKGROUNDED: 'App Backgrounded',
  APP_RESUMED: 'App Resumed',
  SCREEN_VIEWED: 'Screen Viewed',

  // Install attribution (services/installAttribution). These names are a
  // contract with the system that reads them, as First Open is: never rename one.
  /** Android, once per new install: the Play install referrer, in `referrer_0`, `referrer_1`, ... */
  INSTALL_ATTRIBUTION: 'Install Attribution',
  /** Once per new install, at its first completed practice session. */
  ACTIVATED: 'Activated',

  // Review/Practice session events
  WIDGET_OFFER_SHOWN: 'Widget Offer Shown',
  WIDGET_GUIDE_VIEWED: 'Widget Guide Viewed',
  WIDGET_PIN_REQUESTED: 'Widget Pin Requested',
  WIDGET_OFFER_DISMISSED: 'Widget Offer Dismissed',
  WIDGET_ADDED_CONFIRMED: 'Widget Added Confirmed',
  WIDGET_OPENED: 'Widget Opened',
  FIRST_REVIEW_OFFERED: 'First Review Offered',
  FIRST_REVIEW_REMINDER_OFFERED: 'First Review Reminder Offered',
  REVIEW_REMINDER_REQUESTED: 'Review Reminder Requested',
  REVIEW_REMINDER_PLAN_VERIFIED: 'Review Reminder Plan Verified',
  REVIEW_REMINDER_RECOVERY_SHOWN: 'Review Reminder Recovery Shown',
  REVIEW_REMINDER_RECOVERY_ACTION: 'Review Reminder Recovery Action',
  FIRST_SESSION_REVIEW_AND_REMINDER: 'First Session Review And Reminder Verified',
  FIRST_REVIEW_REVEALED: 'First Review Revealed',
  FIRST_REVIEW_WRITE_RESULT: 'First Review Write Result',
  REVIEW_SESSION_STARTED: 'Review Session Started',
  REVIEW_SESSION_ABANDONED: 'Review Session Abandoned',
  REVIEW_WORD_GRADED: 'Review Word Graded',
  PRACTICE_SESSION_COMPLETE: 'Practice Session Complete',

  // Audio playback events
  AUDIO_PLAY_ALL_STARTED: 'Audio Play All Started',
  AUDIO_PLAYBACK_STARTED: 'Audio Playback Started',
  SLEEP_TIMER_SET: 'Sleep Timer Set',

  // Article/Reading events
  FIRST_RUN_SHOWN: 'First Run Shown',
  FIRST_LINE_VISIBLE: 'First Line Visible',
  FIRST_RUN_SKIPPED: 'First Run Skipped',
  READER_TIP_DISMISSED: 'Reader Tip Dismissed',
  AUTH_METHOD_ATTEMPTED: 'Auth Method Attempted',
  AUTH_ATTEMPT_CANCELLED: 'Auth Attempt Cancelled',
  AUTH_ATTEMPT_FAILED: 'Auth Attempt Failed',
  AUTH_SURFACE_DISMISSED: 'Auth Surface Dismissed',
  AUTH_SESSION_VERIFIED: 'Auth Session Verified',
  SAVE_INTENT_RESOLVED: 'Save Intent Resolved',
  AUTH_SURFACE_VIEWED: 'Auth Surface Viewed',
  ARTICLE_VIEWED: 'Article Viewed',
  ARTICLE_BOOKMARKED: 'Article Bookmarked',

  // Vocabulary/Study events
  /** The word card opened in the reader: the step before a save. */
  WORD_CARD_OPENED: 'Word Card Opened',
  /** One event however the word was saved; `method` says how. */
  WORD_ADDED_TO_STUDY: 'Word Added to Study',
  /** A save the daily limit or the due backlog turned down. */
  WORD_ADD_REFUSED: 'Word Add Refused',
  WORD_REMOVED_FROM_STUDY: 'Word Removed from Study',
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
  /** A tap on any notification the app sent. Was 'Smart Reminder Opened', for two of the types. */
  NOTIFICATION_OPENED: 'Notification Opened',
  SMART_REMINDERS_TOGGLED: 'Smart Reminders Toggled',
  NOTIFICATION_PRIMING_SHOWN: 'Notification Priming Shown',
  NOTIFICATION_PRIMING_ACCEPTED: 'Notification Priming Accepted',
  NOTIFICATION_PRIMING_DECLINED: 'Notification Priming Declined',
  VOICE_PRIMING_SHOWN: 'Voice Priming Shown',
  VOICE_PRIMING_ACCEPTED: 'Voice Priming Accepted',
  VOICE_PRIMING_DECLINED: 'Voice Priming Declined',
  /** The OS permission dialog is about to appear: sent only when it really will. */
  PERMISSION_PROMPT_SHOWN: 'Permission Prompt Shown',
  /** Every permission ask, answered by the dialog or by an earlier answer. */
  PERMISSION_RESULT: 'Permission Result',
  REMINDER_SCHEDULING_ERROR: 'Reminder_Scheduling_Error',
  BACKGROUND_TASK_ERROR: 'Background_Task_Error',

  // Voice grading (Parakeet ASR) events. The model's load and prefetch steps
  // are Sentry breadcrumbs (voiceBreadcrumb), not events: only the failure is.
  VOICE_MODEL_FAILED: 'Voice Model Failed',
  /** The headline metric for whether the prefetch works: a review session that
   *  opened with no usable recognizer. Ideally this trends to zero. */
  VOICE_SESSION_STARTED_WITHOUT_MODEL: 'Voice Session Started Without Model',
  VOICE_ARM: 'Voice Arm',
  VOICE_MIC_DENIED: 'Voice Mic Denied',
  VOICE_TRANSCRIPT: 'Voice Transcript',
  VOICE_MATCH: 'Voice Match',
} as const;

/**
 * The product events Mixpanel is allowed to receive.
 *
 * `analytics.track` takes this rather than `string`, so a typo'd or ad-hoc
 * event name is a compile error instead of a row that lands in Mixpanel under
 * a name no dashboard queries — a loss that is invisible until someone goes
 * looking for the funnel and finds it short. Every one of the ~40 existing
 * call sites already spelled the name as `ANALYTICS_EVENTS.X`; this is what
 * makes that convention enforceable.
 *
 * Error taxonomy is deliberately NOT in here — see `analytics.trackError`.
 */
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * The core actions that carry `first_time: true` the first time this install
 * sends them. Mixpanel's own "first time" filter is refused on the Free plan, so
 * the event has to say it. Remembered per install (services/analyticsInstall),
 * so a sign-out and its new anonymous id do not make them first again.
 */
export const FIRST_TIME_EVENTS: ReadonlySet<string> = new Set<AnalyticsEventName>([
  ANALYTICS_EVENTS.ARTICLE_VIEWED,
  ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY,
  ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED,
  ANALYTICS_EVENTS.REVIEW_SESSION_STARTED,
  ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE,
]);

/**
 * Super properties: on every event once registered (`analytics.registerSuperProperties`).
 * None identifies anyone; all but `install_id` split the anonymous ids into groups.
 */
export const SUPER_PROPERTIES = {
  /**
   * A random ID for this install, kept until the app is uninstalled, that joins
   * its events across sign-outs for the system that reads them (the name is a
   * contract with it). Identifies no one. Mixpanel only: never Meta, Sentry or
   * our backend.
   */
  INSTALL_ID: 'install_id',
  /** YYYY-MM-DD the app was installed, for cohorts by install week */
  INSTALL_DATE: 'install_date',
  /** The OS lets the app notify */
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  /** The review reminders setting is on */
  REMINDERS_ENABLED: 'reminders_enabled',
  SIGNED_IN: 'signed_in',
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
