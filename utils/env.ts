/**
 * Environment Variable Utilities
 *
 * Provides safe access to environment variables with proper fallbacks and warnings.
 * Ensures consistent behavior between development and production builds.
 */

/**
 * Safely access environment variables with optional fallbacks and warnings
 *
 * @param key - The environment variable key (e.g., 'EXPO_PUBLIC_SENTRY_DSN')
 * @param fallback - Optional fallback value if environment variable is not set
 * @param warnIfMissing - Whether to warn in development if variable is missing
 * @returns The environment variable value or fallback
 */
export const getEnvVar = (
  key: string,
  fallback?: string,
  warnIfMissing = false
): string | undefined => {
  const value = process.env[key] || fallback;

  if (warnIfMissing && !value && __DEV__) {
    console.warn(`⚠️  Environment variable ${key} not found. Using fallback or undefined.`);
  }

  return value;
};

/**
 * Get required environment variables (throws error if missing)
 *
 * @param key - The environment variable key
 * @param errorMessage - Custom error message if variable is missing
 * @returns The environment variable value
 */
export const getRequiredEnvVar = (key: string, errorMessage?: string): string => {
  const value = process.env[key];

  if (!value) {
    const message = errorMessage || `Required environment variable ${key} is not set`;
    throw new Error(message);
  }

  return value;
};

/**
 * Check if environment variable exists and has a non-empty value
 *
 * @param key - The environment variable key
 * @returns True if variable exists and has a value
 */
export const hasEnvVar = (key: string): boolean => {
  const value = process.env[key];
  return Boolean(value && value.trim());
};
