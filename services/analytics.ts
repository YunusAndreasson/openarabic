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
import { MIXPANEL_TOKEN } from '@/constants/analytics';

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

  // Track custom events
  track: async (event: string, properties?: AnalyticsProperties): Promise<void> => {
    try {
      await initializeMixpanel();

      if (mixpanelInstance?.track) {
        await mixpanelInstance.track(event, properties);
      }
      // Silent success - no logging needed for normal operation
    } catch {
      // Analytics failed silently - this is expected behavior when MIXPANEL_TOKEN is not configured
    }
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
    await analytics.track('Sign In', { method });
  },

  trackSignUp: async (method: string = 'email'): Promise<void> => {
    await analytics.track('Sign Up', { method });
  },

  trackSignOut: async (): Promise<void> => {
    await analytics.track('Sign Out');
  },
};
