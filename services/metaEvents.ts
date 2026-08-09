/**
 * Meta (Facebook) App Events
 * Ad attribution for Meta app-promotion campaigns.
 *
 * SILENT-FAILURE DESIGN PATTERN
 * ==============================
 * Mirrors services/analytics.ts: this module never throws and never logs in
 * production. Ad attribution is strictly non-critical — a failure here must not
 * surface to the user or interrupt a study session.
 *
 * AEM-ONLY (NO ATT PROMPT)
 * ========================
 * The app deliberately never shows Apple's App Tracking Transparency prompt.
 * Consequences, which are intentional and should not be "fixed":
 *
 * - iOS: the IDFA is unavailable (zeroed), so Meta attributes through Aggregated
 *   Event Measurement + SKAdNetwork. That yields campaign-level attribution, not
 *   user-level. It is enough to judge cost per install and cost per activation.
 * - Android: no prompt exists, so the Google Advertising ID IS collected (enabled
 *   via `advertiserIDCollectionEnabled` in app.json). Android attribution is
 *   therefore materially better than iOS. Expect the two platforms to disagree.
 *
 * We do not call setUserID or setUserData (advanced matching). Campaign-level
 * attribution does not need them, and sending account identity to Meta is not a
 * trade this app makes. Do not add them without a deliberate decision.
 *
 * The install/launch event (`fb_mobile_activate_app`) is logged natively by the
 * SDK via `autoLogAppEventsEnabled` in app.json — it does not pass through here.
 *
 * DO NOT ADD META TO `ios.privacyManifests.NSPrivacyTrackingDomains`
 * =================================================================
 * That key is not a disclosure list. iOS BLOCKS every domain listed in it unless
 * the user has granted ATT — and this app never asks. Adding Meta's domains there
 * would silently sever app events and kill attribution outright, with no error to
 * observe. The same trap applies to Mixpanel. `NSPrivacyTracking` is false for the
 * matching reason: with no ATT there is no IDFA, so nothing tracks across apps.
 */
import { NativeModules, Platform } from 'react-native';

import { META_EVENTS } from '@/constants/analytics';

// Meta app event parameters are limited to primitives on the wire.
type MetaEventParams = Record<string, string | number>;

// Minimal surface of react-native-fbsdk-next that this module touches.
interface MetaAppEventsLogger {
  logEvent(eventName: string, parameters?: MetaEventParams): void;
}

interface MetaSettings {
  initializeSDK(): void;
  setAdvertiserTrackingEnabled(enabled: boolean): Promise<boolean>;
}

let appEventsLogger: MetaAppEventsLogger | null = null;
let isSdkInitialized = false;
let loggerResolveAttempts = 0;

/**
 * Reaching AppEventsLogger before native initialization has landed throws out
 * of the JSI proxy ("Exception in HostObject::get for prop 'FBAppEventsLogger'").
 * The throw is caught below, but on Android it is also reported to LogBox, so
 * each attempt costs a red box in development.
 *
 * Two attempts: one immediate, one on a later event, which covers a native init
 * that had not settled in the first tick. Bounded tightly on purpose — a build
 * whose native project carries no Facebook app id never initializes at all, and
 * retrying that forever would just multiply the noise.
 */
const MAX_LOGGER_RESOLVE_ATTEMPTS = 2;

/**
 * Resolve the SDK on first use.
 *
 * The require is lazy and guarded because the Facebook SDK is not linked in Expo
 * Go or under Jest — the same reason services/analytics.ts defers Mixpanel. A
 * miss here leaves appEventsLogger null and every call below becomes a no-op.
 */
const configureMeta = (): void => {
  if (isSdkInitialized) {
    return;
  }

  // Latch before the work: a throw must not leave this retrying on every event.
  isSdkInitialized = true;

  try {
    // `react-native-fbsdk-next` eagerly evaluates every barrel export, including
    // AccessTokenTracker. Loading only the two modules used here prevents an
    // unrelated login tracker from crashing first-run analytics on Android.
    NativeModules['FBSettings']?.initializeSDK?.();

    const Settings = require('react-native-fbsdk-next/lib/commonjs/FBSettings')
      .default as MetaSettings;

    // A checked-in native project can lag behind app.json plugin settings. Make
    // initialization explicit before the first event so Android never reaches
    // AppEventsLogger with an uninitialized FacebookSdk.
    Settings.initializeSDK();

    // Explicit on iOS even though the SDK already derives `false` from an
    // undetermined ATT status. Stating it makes AEM-only mode deliberate rather
    // than incidental, so a future ATT change has to be a conscious edit.
    // iOS-only API — the Android native module does not implement it.
    if (Platform.OS === 'ios') {
      Settings.setAdvertiserTrackingEnabled(false).catch(() => {
        // Already the effective default without ATT — nothing to recover.
      });
    }
  } catch {
    // SDK unavailable (Expo Go / Jest / unlinked build) — stay a no-op.
  }
};

/**
 * Resolve the event logger, separately from initialization and only once the
 * SDK has been asked to initialize. Kept apart from `configureMeta` so a native
 * init that has not settled yet costs one skipped event rather than latching
 * attribution off for the whole process.
 */
const resolveAppEventsLogger = (): MetaAppEventsLogger | null => {
  if (appEventsLogger || loggerResolveAttempts >= MAX_LOGGER_RESOLVE_ATTEMPTS) {
    return appEventsLogger;
  }

  loggerResolveAttempts += 1;

  try {
    appEventsLogger = require('react-native-fbsdk-next/lib/commonjs/FBAppEventsLogger')
      .default as MetaAppEventsLogger;
  } catch {
    // Not ready (or not linked) — a later event tries again, up to the cap.
    appEventsLogger = null;
  }

  return appEventsLogger;
};

export const metaEvents = {
  /**
   * Log a Meta app event. Prefer the named helpers below over calling this with
   * an ad-hoc string, so the full set of data shared with Meta stays greppable
   * in constants/analytics.ts.
   */
  log: (eventName: string, params?: MetaEventParams): void => {
    try {
      configureMeta();
      resolveAppEventsLogger()?.logEvent(eventName, params);
    } catch {
      // Ad attribution is non-critical — never surface this.
    }
  },

  /** Account created. The conversion an install campaign is really buying. */
  logSignUp: (method: string = 'email'): void => {
    metaEvents.log(META_EVENTS.COMPLETED_REGISTRATION, { fb_registration_method: method });
  },

  /** Welcome intro finished — separates engaged installs from bounces. */
  logTutorialComplete: (): void => {
    metaEvents.log(META_EVENTS.COMPLETED_TUTORIAL, { fb_success: '1' });
  },

  /** Practice session finished — the closest proxy for retention we can send. */
  logPracticeSessionComplete: (wordsReviewed: number): void => {
    metaEvents.log(META_EVENTS.PRACTICE_SESSION_COMPLETE, { words_reviewed: wordsReviewed });
  },
};
