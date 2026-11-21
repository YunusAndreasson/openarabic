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
 * NOTHING RUNS WITHOUT CONSENT
 * ============================
 * The SDK is off until the `measurement` choice in services/consent allows it, on
 * every platform and including on upgrade from a version that never asked:
 *
 * - Android: app.json turns off auto-init, auto-logging and advertising ID
 *   collection in the manifest. FacebookInitProvider still calls sdkInitialize at
 *   process start, but until `FacebookSdk.fullyInitialize()` no Graph request gets
 *   a response, so nothing is delivered. `initializeSDK` is that call, and through
 *   .yarn/patches/react-native-fbsdk-next-* it then repeats `activateApp`, whose
 *   one-time install report has otherwise always run too early to get through. It
 *   turns neither setting on, which is why `configureMeta` sets them itself.
 * - iOS: the SDK no longer has an auto-init flag, and this package's AppDelegate
 *   subscriber starts the SDK at launch for everyone. That fetches settings from
 *   Meta, and logs events too if Meta's server-side app setting overrides
 *   `FacebookAutoLogAppEventsEnabled`, which it can. So the subscriber is removed by
 *   .yarn/patches/react-native-fbsdk-next-*, and `initializeSDK` here is the first
 *   the SDK hears of anything. The setters run after it on iOS, because iOS only
 *   persists them once it has been configured.
 *
 * Both settings persist natively, on both platforms, which is what makes a
 * withdrawal last across launches. A process that started the SDK cannot fully undo
 * it, though: what is already queued would still go out, and on iOS the server-side
 * override can keep logging session events. So `stop` also holds the event queue,
 * and those stay on the device. Whatever is held goes out only if the person allows
 * measurement again; on Android a flush on later launches gets nothing through,
 * because nothing has called `fullyInitialize`.
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
 *   by `configureMeta`, after consent). Android attribution is therefore materially
 *   better than iOS. Expect the two platforms to disagree.
 *
 * We do not call setUserID or setUserData (advanced matching). Campaign-level
 * attribution does not need them, and sending account identity to Meta is not a
 * trade this app makes. Do not add them without a deliberate decision.
 *
 * `install_id` (services/installAttribution) is deliberately absent too. It joins
 * everything in Mixpanel, so it must never be sent to Meta.
 *
 * Meta's SDK 19 adds the Screen Title and AppLink URL to every event it logs, and a
 * screen title here can name what someone is studying. This package pins the SDK to
 * 18. Before moving to 19, turn off `AutoLogMetaDataEnabled` and
 * `AutoLogProductImprovementEnabled` (`com.facebook.sdk.` in the Android manifest,
 * `FBSDK` in the iOS Info.plist), or the promise above stops being true.
 *
 * The install/launch event (`fb_mobile_activate_app`) is logged natively by the
 * SDK once `configureMeta` has turned auto-logging on — it does not pass through
 * here.
 *
 * DO NOT ADD META TO `ios.privacyManifests.NSPrivacyTrackingDomains`
 * =================================================================
 * That key is not a disclosure list. iOS BLOCKS every domain listed in it unless
 * the user has granted ATT — and this app never asks. Adding Meta's domains there
 * would silently sever app events and kill attribution outright, with no error to
 * observe. The same trap applies to Mixpanel. `NSPrivacyTracking` is false for the
 * matching reason: with no ATT there is no IDFA, so nothing tracks across apps.
 */
import type { AppEventsLogger, Settings } from 'react-native-fbsdk-next';

import { LogBox, Platform } from 'react-native';

import { META_EVENTS } from '@/constants/analytics';
import { isAllowed } from '@/services/consent';

// The exception below is already caught (see resolveAppEventsLogger) and never
// affects app behavior — react-native-fbsdk-next reads native constants at
// require() time (FBAppEventsLogger.ts top-level `getConstants()`), which
// constructs the native AppEventsLoggerImpl and throws if FacebookSdk hasn't
// finished initializing yet. Android's bridge reports that native throw to
// LogBox as a fatal-looking "Uncaught Error" regardless of the JS catch, so
// without this it shows a full red error screen for a condition the retry
// logic below already treats as a safe, expected no-op.
LogBox.ignoreLogs(["Exception in HostObject::get for prop 'FBAppEventsLogger'"]);

// Meta app event parameters are limited to primitives on the wire.
type MetaEventParams = Record<string, string | number>;

let appEventsLogger: typeof AppEventsLogger | null = null;
let isSdkInitialized = false;
let isEventQueueHeld = false;
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
 * Lazy and guarded because the Facebook SDK is not linked in Expo Go or under Jest
 * — the same reason services/analytics.ts defers Mixpanel. `react-native-fbsdk-next`
 * eagerly evaluates every barrel export, including AccessTokenTracker, so this
 * loads only the module it needs: that prevents an unrelated login tracker from
 * crashing first-run analytics on Android.
 */
const loadSettings = (): typeof Settings =>
  (
    require('react-native-fbsdk-next/lib/commonjs/FBSettings') as {
      default: typeof Settings;
    }
  ).default;

const setCollectionEnabled = (settings: typeof Settings, enabled: boolean): void => {
  settings.setAutoLogAppEventsEnabled(enabled);
  settings.setAdvertiserIDCollectionEnabled(enabled);
};

/**
 * Switch the SDK on, once allowed. A miss on the require leaves appEventsLogger
 * null and every call below becomes a no-op.
 */
const configureMeta = (): void => {
  if (isSdkInitialized || !isAllowed('measurement')) {
    return;
  }

  // Latch before the work: a throw must not leave this retrying on every event.
  isSdkInitialized = true;

  try {
    const settings = loadSettings();

    if (Platform.OS === 'ios') {
      settings.initializeSDK();
      setCollectionEnabled(settings, true);

      // Explicit on iOS even though the SDK already derives `false` from an
      // undetermined ATT status. Stating it makes AEM-only mode deliberate rather
      // than incidental, so a future ATT change has to be a conscious edit.
      // iOS-only API — the Android native module does not implement it.
      settings.setAdvertiserTrackingEnabled(false).catch(() => {
        // Already the effective default without ATT — nothing to recover.
      });
    } else {
      // Set first: once `initializeSDK` has run, the next flush may already be
      // sending, and it should not go out without what was just allowed.
      setCollectionEnabled(settings, true);
      settings.initializeSDK();
    }

    if (isEventQueueHeld) {
      isEventQueueHeld = false;
      resolveAppEventsLogger()?.setFlushBehavior('auto');
    }

    // The SDK logs the launch natively, before JS is up, and that flush fails the
    // "not fully initialized" check and goes back to disk. Nothing else would send
    // it for someone who only reads, whose session raises no event of its own.
    if (Platform.OS !== 'ios') {
      resolveAppEventsLogger()?.flush();
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
const resolveAppEventsLogger = (): typeof AppEventsLogger | null => {
  if (appEventsLogger || loggerResolveAttempts >= MAX_LOGGER_RESOLVE_ATTEMPTS) {
    return appEventsLogger;
  }

  loggerResolveAttempts += 1;

  try {
    appEventsLogger = (
      require('react-native-fbsdk-next/lib/commonjs/FBAppEventsLogger') as {
        default: typeof AppEventsLogger;
      }
    ).default;
  } catch {
    // Not ready (or not linked) — a later event tries again, up to the cap.
    appEventsLogger = null;
  }

  return appEventsLogger;
};

export const metaEvents = {
  /** Measurement is allowed, now or from an earlier launch: switch the SDK on. */
  start: (): void => {
    configureMeta();
  },

  /**
   * Measurement is not allowed: turn the SDK's settings off and hold its queue
   * (see NOTHING RUNS WITHOUT CONSENT above), then release the latch so a later
   * grant configures it again. services/privacy calls this only where Meta can have
   * been switched on, so a refusal on a device that never allowed it stays no call.
   */
  stop: (): void => {
    const wasStarted = isSdkInitialized;
    isSdkInitialized = false;

    try {
      // iOS ignores its settings until something starts the SDK, and nothing will.
      if (Platform.OS === 'ios' && !wasStarted) return;

      setCollectionEnabled(loadSettings(), false);

      if (wasStarted) {
        isEventQueueHeld = true;
        resolveAppEventsLogger()?.setFlushBehavior('explicit_only');
      }
    } catch {
      // SDK unavailable — there is nothing running to stop.
    } finally {
      loggerResolveAttempts = 0;
    }
  },

  /**
   * Log a Meta app event. Prefer the named helpers below over calling this with
   * an ad-hoc string, so the full set of data shared with Meta stays greppable
   * in constants/analytics.ts.
   *
   * Dropped, not queued, unless measurement is allowed.
   */
  log: (eventName: string, params?: MetaEventParams): void => {
    try {
      if (!isAllowed('measurement')) {
        return;
      }

      configureMeta();
      const logger = resolveAppEventsLogger();
      if (params) {
        logger?.logEvent(eventName, params);
      } else {
        logger?.logEvent(eventName);
      }
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
