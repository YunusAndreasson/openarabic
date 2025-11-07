/**
 * Environment Variable Type Declarations
 *
 * Explicitly declare EXPO_PUBLIC_ environment variables to satisfy TypeScript's
 * noPropertyAccessFromIndexSignature rule while allowing Expo's Metro bundler
 * to properly inline these values using dot notation.
 *
 * Without these declarations, TypeScript would require bracket notation
 * (process.env['VAR']), but Expo's bundler requires dot notation
 * (process.env.VAR) for static analysis and inlining.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Sentry configuration
      EXPO_PUBLIC_SENTRY_DSN?: string;

      // Analytics configuration
      EXPO_PUBLIC_MIXPANEL_TOKEN?: string;

      // Google Sign In configuration
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;

      // Apple Sign In configuration (Android)
      EXPO_PUBLIC_APPLE_SERVICE_ID?: string;

      // Expo Updates configuration
      EXPO_PUBLIC_UPDATES_ENABLED?: string;
      EXPO_PUBLIC_UPDATES_CHECK_AUTOMATICALLY?: string;
      EXPO_PUBLIC_UPDATES_FALLBACK_TO_CACHE_TIMEOUT?: string;
    }
  }
}

export {};
