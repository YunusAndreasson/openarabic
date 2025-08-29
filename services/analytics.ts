/**
 * Analytics Service
 * Simple wrapper around Mixpanel for consistent analytics tracking
 *
 * Note: This implementation uses console.log for development tracking
 */

import { MIXPANEL_TOKEN } from '@/constants/analytics';

// Simple analytics service - logs events to console
export const analytics = {
  // Identify user with properties
  identify: async (userId: string, properties?: Record<string, unknown>): Promise<void> => {
    try {
      if (!MIXPANEL_TOKEN) {
        console.log('🔍 ANALYTICS DISABLED: identify()', { userId, properties });
        return;
      }

      console.log('🔍 ANALYTICS: identify()', { userId, properties });
    } catch (error) {
      console.warn('Analytics identify failed:', error);
    }
  },

  // Track custom events
  track: async (event: string, properties?: Record<string, unknown>): Promise<void> => {
    try {
      if (!MIXPANEL_TOKEN) {
        console.log('🔍 ANALYTICS DISABLED: track()', { event, properties });
        return;
      }

      console.log('🔍 ANALYTICS: track()', { event, properties });
    } catch (error) {
      console.warn('Analytics track failed:', error);
    }
  },

  // Reset user (for logout)
  reset: async (): Promise<void> => {
    try {
      if (MIXPANEL_TOKEN === 'YOUR_MIXPANEL_TOKEN_HERE') {
        console.log('🔍 ANALYTICS: reset()');
        return;
      }

      console.log('🔍 ANALYTICS: reset()');
    } catch (error) {
      console.warn('Analytics reset failed:', error);
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
