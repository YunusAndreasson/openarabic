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
 * Testing Implications:
 * - Tests should verify "does not throw" rather than mock internals
 * - No need to test Mixpanel SDK behavior (third-party responsibility)
 * - Focus on: method signatures, type safety, error resilience
 *
 * Features:
 * - Lazy initialization (only when first analytics call is made)
 * - Automatic fallback when Mixpanel is unavailable
 * - Silent success operation (no production logging)
 * - Type-safe interface
 */

import type * as MixpanelModule from 'mixpanel-react-native';

import type { AnalyticsEventName } from '@/constants/analytics';
import { ANALYTICS_EVENTS, FIRST_TIME_EVENTS, MIXPANEL_TOKEN } from '@/constants/analytics';
import { claimFirstTime } from '@/services/analyticsInstall';

// Keep app properties narrower than the SDK's permissive property values.
type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

// Analytics instance and initialization state
let mixpanelInstance: MixpanelModule.Mixpanel | null = null;

/**
 * Kept here as well as on the instance because Mixpanel forgets them: `reset()`
 * clears the super properties, and the instance may not exist yet when they
 * arrive. Applied at init and again after every reset.
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
    await initializeMixpanel();

    const instance = mixpanelInstance;
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
      await initializeMixpanel();

      if (mixpanelInstance) {
        mixpanelInstance.reset();
        // reset() clears the super properties; install_date and the rest outlive a sign-out.
        applySuperProperties(mixpanelInstance);
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
      await initializeMixpanel();
      mixpanelInstance?.registerSuperProperties(properties);
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
