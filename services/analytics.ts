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

// Minimal interface for analytics properties
import type { AnalyticsEventName } from '@/constants/analytics';
import {
  ANALYTICS_EVENTS,
  INSTALL_ID_PROPERTY,
  MIXPANEL_SERVER_URL,
  MIXPANEL_TOKEN,
} from '@/constants/analytics';
import { isAllowed, loadConsent } from '@/services/consent';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

// Minimal interface for Mixpanel instance
interface MixpanelInstance {
  init(
    optOutTrackingDefault?: boolean,
    superProperties?: AnalyticsProperties,
    serverURL?: string,
  ): Promise<void>;
  identify(userId: string): Promise<void>;
  getPeople(): Promise<{ set: (properties: AnalyticsProperties) => void }>;
  track(event: string, properties?: AnalyticsProperties): Promise<void>;
  reset(): Promise<void>;
  registerSuperProperties(properties: AnalyticsProperties): void;
  hasOptedOutTracking(): Promise<boolean>;
  optInTracking(): void;
  optOutTracking(): void;
}

// Analytics instance and initialization state
let mixpanelInstance: MixpanelInstance | null = null;

/**
 * Kept here as well as on the instance because Mixpanel forgets them. `reset()`
 * and `optOutTracking()` both clear the super properties and the identity, and
 * the instance may not exist yet when they arrive.
 */
let installId: string | null = null;
let identifiedUserId: string | null = null;

// React Native global for development mode detection
declare const __DEV__: boolean;

const startMixpanel = async (token: string): Promise<void> => {
  const { Mixpanel } = require('mixpanel-react-native');

  const trackAutomaticEvents = false;
  const instance: MixpanelInstance = new Mixpanel(token.trim(), trackAutomaticEvents);
  // An undefined server URL keeps the SDK's own default.
  await instance.init(false, {}, MIXPANEL_SERVER_URL);
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
const getConsentedInstance = async (): Promise<MixpanelInstance | null> => {
  await loadConsent();
  if (!isAllowed('analytics')) return null;

  await initializeMixpanel();
  return isAllowed('analytics') ? mixpanelInstance : null;
};

const applyInstallId = (instance: MixpanelInstance): void => {
  if (installId) instance.registerSuperProperties({ [INSTALL_ID_PROPERTY]: installId });
};

/**
 * The one place an event reaches Mixpanel. Both public doors funnel through it
 * so the lazy-init and silent-failure contract is written once.
 */
const sendToMixpanel = async (event: string, properties?: AnalyticsProperties): Promise<void> => {
  try {
    const instance = await getConsentedInstance();
    await instance?.track(event, properties);
    // Silent success - no logging needed for normal operation
  } catch {
    // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
  }
};

// Simple analytics service with Mixpanel integration
export const analytics = {
  // Identify user with properties
  identify: async (userId: string, properties?: AnalyticsProperties): Promise<void> => {
    // Remembered, not sent: `startTracking` picks it up if consent comes later.
    identifiedUserId = userId;

    try {
      const instance = await getConsentedInstance();

      if (instance) {
        await instance.identify(userId);
        if (properties) {
          const people = await instance.getPeople();
          if (people) {
            people.set(properties);
          }
        }
      }
      // Silent success - no logging needed for normal operation
    } catch {
      // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
    }
  },

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

  // Reset user (for logout)
  reset: async (): Promise<void> => {
    identifiedUserId = null;

    try {
      const instance = await getConsentedInstance();

      if (instance) {
        await instance.reset();
        // reset() clears the super properties, and install_id outlives a sign-out.
        applyInstallId(instance);
      }
      // Silent success - no logging needed for normal operation
    } catch {
      // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
    }
  },

  /**
   * Analytics is allowed, now or from an earlier launch: bring Mixpanel up.
   *
   * The opt-out is checked rather than remembered, because Mixpanel persists it
   * natively and it survives both a relaunch and `init`: someone who withdrew on an
   * earlier launch would otherwise be initialised and still silently opted out.
   * Opting back in comes first, since an opted-out SDK ignores the calls after it.
   */
  startTracking: async (): Promise<void> => {
    try {
      const instance = await getConsentedInstance();
      if (!instance) return;

      if (await instance.hasOptedOutTracking()) {
        instance.optInTracking();
      }
      applyInstallId(instance);
      if (identifiedUserId) {
        await instance.identify(identifiedUserId);
      }
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

  /**
   * Put the install's random ID on every event from now on, as a super property.
   * Only Mixpanel ever receives it: it must never be sent to Meta.
   */
  registerInstallId: async (id: string): Promise<void> => {
    installId = id;

    try {
      const instance = await getConsentedInstance();
      if (instance) applyInstallId(instance);
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
};
