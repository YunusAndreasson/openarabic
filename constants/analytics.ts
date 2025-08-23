/**
 * Analytics Constants
 * Mixpanel configuration and event names
 */

// Your Mixpanel project token - REPLACE THIS with your actual token
export const MIXPANEL_TOKEN =
  process.env['EXPO_PUBLIC_MIXPANEL_TOKEN'] || 'YOUR_MIXPANEL_TOKEN_HERE';

// Analytics event names - keep consistent across the app
export const ANALYTICS_EVENTS = {
  // Authentication events
  SIGN_IN: 'Sign In',
  SIGN_UP: 'Sign Up',
  SIGN_OUT: 'Sign Out',

  // Practice session events
  PRACTICE_SESSION_COMPLETE: 'Practice Session Complete',

  // Error tracking events
  ERROR_OCCURRED: 'Error Occurred',

  // App usage events (add more as needed)
  APP_OPEN: 'App Open',
} as const;

// User property keys for identify calls
export const USER_PROPERTIES = {
  EMAIL: 'email',
  LAST_ACTIVE: 'last_active',
  LAST_SIGN_IN: 'last_sign_in',
  CREATED_AT: 'created_at',
} as const;
