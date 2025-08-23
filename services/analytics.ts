/**
 * Analytics Service
 * Simple wrapper around Mixpanel for consistent analytics tracking
 *
 * Note: This implementation uses a simple console.log fallback
 * Replace with actual Mixpanel calls once you have your token configured
 */

import { MIXPANEL_TOKEN } from '@/constants/analytics';

// Simple analytics service - logs events to console for now
// Replace with real Mixpanel calls when you have your token
export const analytics = {
  // Identify user with properties
  identify: async (userId: string, properties?: Record<string, unknown>): Promise<void> => {
    try {
      if (MIXPANEL_TOKEN === 'YOUR_MIXPANEL_TOKEN_HERE') {
        console.log('🔍 ANALYTICS: identify()', { userId, properties });
        return;
      }

      // TODO: Replace with actual Mixpanel implementation
      // const Mixpanel = require('mixpanel-react-native');
      // await Mixpanel.sharedInstanceWithToken(MIXPANEL_TOKEN);
      // await Mixpanel.instance.identify(userId);
      // if (properties) await Mixpanel.instance.set(properties);

      console.log('🔍 ANALYTICS: identify()', { userId, properties });
    } catch (error) {
      console.warn('Analytics identify failed:', error);
    }
  },

  // Track custom events
  track: async (event: string, properties?: Record<string, unknown>): Promise<void> => {
    try {
      if (MIXPANEL_TOKEN === 'YOUR_MIXPANEL_TOKEN_HERE') {
        console.log('🔍 ANALYTICS: track()', { event, properties });
        return;
      }

      // TODO: Replace with actual Mixpanel implementation
      // const Mixpanel = require('mixpanel-react-native');
      // await Mixpanel.sharedInstanceWithToken(MIXPANEL_TOKEN);
      // await Mixpanel.instance.track(event, properties);

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

      // TODO: Replace with actual Mixpanel implementation
      // const Mixpanel = require('mixpanel-react-native');
      // await Mixpanel.sharedInstanceWithToken(MIXPANEL_TOKEN);
      // await Mixpanel.instance.reset();

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
