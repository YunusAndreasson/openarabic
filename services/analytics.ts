/**
 * Analytics Service
 * Production-ready Mixpanel integration with silent operation
 *
 * SILENT-FAILURE DESIGN PATTERN
 * ==============================
 * This service is designed to fail silently and never throw errors.
 * Analytics failures should never crash the app or disrupt user experience.
 *
 * Why Silent Failures:
 * - Analytics is a non-critical feature - user experience takes priority
 * - Missing MIXPANEL_TOKEN is expected in development/test environments
 * - Network failures should not block user actions
 * - Third-party SDK errors should not propagate to app code
 *
 * Expected Behavior:
 * - ✅ Missing token → silent no-op (expected in dev/test)
 * - ✅ Initialization fails → silent no-op (SDK issues)
 * - ✅ Network errors → silent no-op (offline mode)
 * - ✅ Invalid data → silent no-op (malformed properties)
 * - ❌ NEVER throws exceptions
 * - ❌ NEVER logs errors in production
 *
 * CONSENT GATE
 * ============
 * Mixpanel is not constructed or initialised until the `analytics` choice in
 * services/consent allows it, so before that there is no network at all. Every
 * call first waits for the stored choice to load and then returns silently unless
 * it allows the call, so a first-launch `App Opened` is dropped rather than
 * queued. services/privacy starts and stops tracking when the choice changes.
 *
 * Testing Implications:
 * - Tests should verify "does not throw" rather than mock internals
 * - No need to test Mixpanel SDK behavior (third-party responsibility)
 * - Focus on: method signatures, type safety, error resilience
 *
 * Features:
 * - Lazy initialization (only when first allowed analytics call is made)
 * - Automatic fallback when Mixpanel is unavailable
 * - Silent success operation (no production logging)
 * - Type-safe interface
 */

import type * as MixpanelModule from 'mixpanel-react-native';

import type { AnalyticsEventName } from '@/constants/analytics';
import {
  ANALYTICS_EVENTS,
  FIRST_TIME_EVENTS,
  MIXPANEL_TOKEN,
  SUPER_PROPERTIES,
} from '@/constants/analytics';
import { claimFirstTime, ensureInstallId } from '@/services/analyticsInstall';
import { isAllowed, loadConsent } from '@/services/consent';

// Keep app properties narrower than the SDK's permissive property values.
type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

// Analytics instance and initialization state
let mixpanelInstance: MixpanelModule.Mixpanel | null = null;

/**
 * Kept here as well as on the instance because Mixpanel forgets them: `reset()`
 * and `optOutTracking()` both clear the super properties, and the instance may
 * not exist yet when they arrive. Applied at init, after every reset and on
 * opting back in.
 */
let superProperties: AnalyticsProperties = {};

const applySuperProperties = (instance: MixpanelModule.Mixpanel): void => {
  if (Object.keys(superProperties).length > 0) instance.registerSuperProperties(superProperties);
};

// React Native global for development mode detection
declare const __DEV__: boolean;

const startMixpanel = async (token: string): Promise<void> => {
  const { Mixpanel } = require('mixpanel-react-native') as typeof MixpanelModule;

  // Publish only a successfully initialized SDK instance.
  const trackAutomaticEvents = false;
  const instance = new Mixpanel(token.trim(), trackAutomaticEvents);
  await instance.init();

  // `install_id` joins an install's events for the system that reads them, so
  // it is in place before the first event goes out. Made here, the first time
  // analytics is allowed, and kept by services/analyticsInstall. Mixpanel only:
  // it must never reach Meta.
  const installId = await ensureInstallId();
  if (installId) superProperties = { ...superProperties, [SUPER_PROPERTIES.INSTALL_ID]: installId };

  applySuperProperties(instance);
  mixpanelInstance = instance;
};

/**
 * The one initialization in flight or done. Memoised as a promise, not a flag:
 * a flag set only once `init()` resolved let concurrent first calls each see it
 * unset, and each construct and initialise its own Mixpanel instance.
 */
let initialization: Promise<void> | null = null;

const initializeMixpanel = (): Promise<void> => {
  if (!MIXPANEL_TOKEN) {
    return Promise.resolve(); // No token
  }

  initialization ??= startMixpanel(MIXPANEL_TOKEN).catch(() => {
    // Analytics initialization failed - silently continue without analytics
    // This is expected behavior when MIXPANEL_TOKEN is not configured.
    // Forgotten, so a later call tries again, as a failed init always has.
    initialization = null;
  });
  return initialization;
};

/**
 * The gate every call passes through: the instance to use, or null when nothing
 * may be sent. This is the only path to `initializeMixpanel`, which is what keeps
 * Mixpanel unconstructed without consent. The second check is for a withdrawal
 * that landed while an initialization was in flight.
 */
const getConsentedInstance = async (): Promise<MixpanelModule.Mixpanel | null> => {
  await loadConsent();
  if (!isAllowed('analytics')) return null;

  await initializeMixpanel();
  return isAllowed('analytics') ? mixpanelInstance : null;
};

/**
 * `first_time: true` on the first of each core action this install sends
 * (FIRST_TIME_EVENTS). Claimed only once an instance exists to send it.
 */
const withFirstTime = async (
  event: string,
  properties?: AnalyticsProperties,
): Promise<AnalyticsProperties | undefined> => {
  if (!FIRST_TIME_EVENTS.has(event) || !(await claimFirstTime(event))) return properties;
  return { ...properties, first_time: true };
};

/**
 * The one place an event reaches Mixpanel. Both public doors funnel through it
 * so the lazy-init and silent-failure contract is written once.
 */
const sendToMixpanel = async (event: string, properties?: AnalyticsProperties): Promise<void> => {
  try {
    const instance = await getConsentedInstance();
    if (instance) {
      instance.track(event, await withFirstTime(event, properties));
    }
    // Silent success - no logging needed for normal operation
  } catch {
    // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
  }
};

/**
 * Simple analytics service with Mixpanel integration.
 *
 * Anonymous by design: events stay on the device's own Mixpanel distinct_id.
 * There is deliberately no `identify` or people-profile door, and no event may
 * carry a user id, email or name — the account is never linked to analytics.
 */
export const analytics = {
  /**
   * Track a product event.
   *
   * Narrowed to `AnalyticsEventName`, so the event must come from
   * `ANALYTICS_EVENTS`. A hand-written string here used to compile, ship, and
   * quietly split one funnel across two spellings.
   */
  track: async (event: AnalyticsEventName, properties?: AnalyticsProperties): Promise<void> => {
    await sendToMixpanel(event, properties);
  },

  /**
   * Track a FAILURE, whose name is a free string.
   *
   * Errors carry their own taxonomy — one name per `catch` block, read as a
   * prefix search rather than picked from a list (see `ErrorOptions`). Kept as
   * its own door so that staying open for errors does not also reopen `track`
   * to arbitrary strings; `handleError` is the only caller.
   */
  trackError: async (event: string, properties?: AnalyticsProperties): Promise<void> => {
    await sendToMixpanel(event, properties);
  },

  // Start a fresh anonymous distinct_id (sign-out, account deletion)
  reset: async (): Promise<void> => {
    try {
      const instance = await getConsentedInstance();

      if (instance) {
        instance.reset();
        // reset() clears the super properties; install_id, install_date and the
        // rest outlive a sign-out.
        applySuperProperties(instance);
      }
      // Silent success - no logging needed for normal operation
    } catch {
      // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
    }
  },

  /**
   * Put these properties on every event from now on (SUPER_PROPERTIES). Merged
   * into the ones already registered, and applied again at init and after every
   * `reset()`.
   */
  registerSuperProperties: async (properties: AnalyticsProperties): Promise<void> => {
    superProperties = { ...superProperties, ...properties };

    try {
      const instance = await getConsentedInstance();
      instance?.registerSuperProperties(properties);
    } catch {
      // Analytics failed silently
    }
  },

  /**
   * Analytics is allowed, now or from an earlier launch: bring Mixpanel up.
   *
   * The opt-out is checked rather than remembered, because Mixpanel persists it
   * natively and it survives both a relaunch and `init`: someone who withdrew on an
   * earlier launch would otherwise be initialised and still silently opted out.
   * Opting back in comes first, since an opted-out SDK ignores the calls after it,
   * and the super properties go back on after it, since opting out cleared them.
   */
  startTracking: async (): Promise<void> => {
    try {
      const instance = await getConsentedInstance();
      if (!instance) return;

      if (await instance.hasOptedOutTracking()) {
        instance.optInTracking();
      }
      applySuperProperties(instance);
    } catch {
      // Analytics failed silently
    }
  },

  /**
   * Analytics is not allowed. Opts an existing instance out, which also deletes
   * whatever it has not sent yet. Never constructs one: with no instance this
   * launch, refusing has nothing to do and Mixpanel stays untouched.
   */
  stopTracking: async (): Promise<void> => {
    try {
      // An initialization in flight has to land first, or there is nothing to opt
      // out, and the choice may have changed again by the time it has.
      await initialization;
      if (!isAllowed('analytics')) {
        mixpanelInstance?.optOutTracking();
      }
    } catch {
      // Analytics failed silently
    }
  },

  // Convenience methods for common events
  trackSignIn: async (method: string = 'email'): Promise<void> => {
    await analytics.track(ANALYTICS_EVENTS.SIGN_IN, { method });
  },

  trackSignUp: async (method: string = 'email'): Promise<void> => {
    await analytics.track(ANALYTICS_EVENTS.SIGN_UP, { method });
  },

  trackSignOut: async (): Promise<void> => {
    await analytics.track(ANALYTICS_EVENTS.SIGN_OUT);
  },

  /** `code` is a machine code ('cancelled', a Supabase or native code, a status), never a message. */
  trackAuthFailed: async (method: string, code: string): Promise<void> => {
    await analytics.track(ANALYTICS_EVENTS.AUTH_FAILED, { method, code });
  },
};
