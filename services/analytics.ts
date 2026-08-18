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

// Minimal interface for analytics properties
import type { AnalyticsEventName } from '@/constants/analytics';
import { ANALYTICS_EVENTS, MIXPANEL_TOKEN } from '@/constants/analytics';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

// Minimal interface for Mixpanel instance
interface MixpanelInstance {
  init(): Promise<void>;
  identify(userId: string): Promise<void>;
  getPeople(): Promise<{ set: (properties: AnalyticsProperties) => void }>;
  track(event: string, properties?: AnalyticsProperties): Promise<void>;
  reset(): Promise<void>;
}

// Analytics instance and initialization state
let mixpanelInstance: MixpanelInstance | null = null;

// React Native global for development mode detection
declare const __DEV__: boolean;
let isInitialized = false;

const initializeMixpanel = async (): Promise<void> => {
  if (isInitialized || !MIXPANEL_TOKEN) {
    return; // Already initialized or no token
  }

  try {
    const { Mixpanel } = require('mixpanel-react-native');

    // Official v3.1.2 initialization pattern
    const trackAutomaticEvents = false;
    mixpanelInstance = new Mixpanel(MIXPANEL_TOKEN.trim(), trackAutomaticEvents);
    if (mixpanelInstance) {
      await mixpanelInstance.init();
    }

    isInitialized = true;
  } catch {
    // Analytics initialization failed - silently continue without analytics
    // This is expected behavior when MIXPANEL_TOKEN is not configured
  }
};

/**
 * The one place an event reaches Mixpanel. Both public doors funnel through it
 * so the lazy-init and silent-failure contract is written once.
 */
const sendToMixpanel = async (event: string, properties?: AnalyticsProperties): Promise<void> => {
  try {
    await initializeMixpanel();

    if (mixpanelInstance?.track) {
      await mixpanelInstance.track(event, properties);
    }
    // Silent success - no logging needed for normal operation
  } catch {
    // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
  }
};

// Simple analytics service with Mixpanel integration
export const analytics = {
  // Identify user with properties
  identify: async (userId: string, properties?: AnalyticsProperties): Promise<void> => {
    try {
      await initializeMixpanel();

      if (mixpanelInstance?.identify) {
        await mixpanelInstance.identify(userId);
        if (properties) {
          const people = await mixpanelInstance.getPeople();
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
    try {
      await initializeMixpanel();

      if (mixpanelInstance?.reset) {
        await mixpanelInstance.reset();
      }
      // Silent success - no logging needed for normal operation
    } catch {
      // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
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
