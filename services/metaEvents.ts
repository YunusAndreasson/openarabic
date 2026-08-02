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
import { Platform } from 'react-native';

import { META_EVENTS } from '@/constants/analytics';

// Meta app event parameters are limited to primitives on the wire.
type MetaEventParams = Record<string, string | number>;

// Minimal surface of react-native-fbsdk-next that this module touches.
interface MetaAppEventsLogger {
  logEvent(eventName: string, parameters?: MetaEventParams): void;
}

interface MetaSettings {
  setAdvertiserTrackingEnabled(enabled: boolean): Promise<boolean>;
}

let appEventsLogger: MetaAppEventsLogger | null = null;
let isConfigured = false;

/**
 * Resolve the SDK on first use.
 *
 * The require is lazy and guarded because the Facebook SDK is not linked in Expo
 * Go or under Jest — the same reason services/analytics.ts defers Mixpanel. A
 * miss here leaves appEventsLogger null and every call below becomes a no-op.
 */
const configureMeta = (): void => {
  if (isConfigured) {
    return;
  }

  // Latch before the work: a throw must not leave this retrying on every event.
  isConfigured = true;

  try {
    const { AppEventsLogger, Settings } = require('react-native-fbsdk-next') as {
      AppEventsLogger: MetaAppEventsLogger;
      Settings: MetaSettings;
    };

    appEventsLogger = AppEventsLogger;

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

export const metaEvents = {
  /**
   * Log a Meta app event. Prefer the named helpers below over calling this with
   * an ad-hoc string, so the full set of data shared with Meta stays greppable
   * in constants/analytics.ts.
   */
  log: (eventName: string, params?: MetaEventParams): void => {
    try {
      configureMeta();
      appEventsLogger?.logEvent(eventName, params);
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
