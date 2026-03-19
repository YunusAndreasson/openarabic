import * as Sentry from '@sentry/react-native';

import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { analytics } from '@/services/analytics';
import { ToastType } from '@/types/enums';

/**
 * Safely converts an unknown error to an Error object.
 * Useful for catch blocks where the error type is unknown.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  // Handle plain objects with a message property (e.g. Supabase error objects)
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return new Error(error.message);
  }
  return new Error(String(error));
}

// Store toast handler globally - updated to support types
let globalToastHandler: ((message: string, duration?: number, type?: ToastType) => void) | null =
  null;

// Function to set the toast handler (call this in your ToastProvider)
export const setGlobalToastHandler = (
  handler: (message: string, duration?: number, type?: ToastType) => void,
): void => {
  globalToastHandler = handler;
};

/**
 * Show a success toast message
 * Used for positive feedback like "Email sent", "Account created", etc.
 */
export const showSuccessToast = (
  message: string,
  duration: number = DEFAULT_TOAST_DURATION,
): void => {
  if (globalToastHandler) {
    globalToastHandler(message, duration, ToastType.SUCCESS);
  }
};

interface ErrorOptions {
  // Whether to show a toast message to the user
  showToast?: boolean;
  // Custom toast message (if not provided, will use error.message)
  toastMessage?: string;
  // Toast duration in ms (default: 2500)
  toastDuration?: number;
  // Toast type for visual styling
  toastType?: ToastType;
  // Whether to track in Mixpanel
  trackAnalytics?: boolean;
  // Custom analytics event name (default: 'Error Occurred')
  analyticsEventName?: string;
  // Additional analytics properties
  analyticsProperties?: Record<string, boolean | number | string>;
  // Whether to capture in Sentry
  captureSentry?: boolean;
  // Sentry severity level
  sentrySeverity?: 'debug' | 'error' | 'fatal' | 'info' | 'warning';
  // Sentry tags for better categorization
  sentryTags?: Record<string, string>;
  // Sentry extra context
  sentryExtra?: Record<string, unknown>;
}

const DEFAULT_OPTIONS: ErrorOptions = {
  showToast: true,
  toastType: ToastType.ERROR, // Default to error type for error handler
  trackAnalytics: true,
  captureSentry: true,
  sentrySeverity: 'error',
};

/**
 * Checks if an error is an expected authentication failure that shouldn't be logged to Sentry.
 * These are normal user errors (wrong password, invalid credentials) not system errors.
 *
 * We still log system errors like:
 * - Network failures
 * - Server errors (500s, etc.)
 * - Configuration issues
 * - Token refresh failures
 * - Rate limiting
 * - Other unexpected errors
 */
const isExpectedAuthError = (error: Error | string): boolean => {
  const errorMessage =
    typeof error === 'string' ? error.toLowerCase() : error.message?.toLowerCase() || '';
  const errorName = typeof error === 'string' ? '' : error.name || '';

  // Only filter specific user mistakes - these are expected and don't indicate system problems
  const userMistakePatterns = [
    'invalid login credentials', // Exact match for the Sentry issue
    'invalid credentials', // Generic invalid credentials
    'invalid email', // User input validation error (email format)
    'wrong password',
    'incorrect password',
  ];

  // Check if error message matches any user mistake pattern
  const isUserMistake = userMistakePatterns.some(pattern => errorMessage.includes(pattern));

  // For AuthApiError, only filter if it's specifically about invalid credentials
  // Other AuthApiErrors (network issues, server errors, rate limits) should still be logged
  const isInvalidCredentialsAuthError =
    errorName === 'AuthApiError' &&
    (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials'));

  return isUserMistake || isInvalidCredentialsAuthError;
};

// Helper functions to reduce complexity
const captureInSentry = (
  errorObj: Error,
  sentrySeverity?: string,
  sentryTags?: Record<string, string>,
  sentryExtra?: Record<string, unknown>,
): void => {
  try {
    Sentry.withScope(scope => {
      if (sentrySeverity) {
        scope.setLevel(sentrySeverity as Sentry.SeverityLevel);
      }
      if (sentryTags) {
        Object.entries(sentryTags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (sentryExtra) {
        Object.entries(sentryExtra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(errorObj);
    });
  } catch {
    // If Sentry itself fails, silently continue
  }
};

const showToastMessage = (
  errorObj: Error,
  message?: string,
  duration?: number,
  type?: ToastType,
): void => {
  if (globalToastHandler) {
    const toastMessage = message || errorObj.message;
    globalToastHandler(toastMessage, duration, type);
  }
};

const trackErrorAnalytics = async (
  errorObj: Error,
  eventName?: string,
  additionalProperties?: Record<string, boolean | number | string>,
): Promise<void> => {
  try {
    const analyticsProperties = {
      errorMessage: errorObj.message,
      errorName: errorObj.name,
      errorStack: errorObj.stack?.substring(0, 500), // Limit stack trace length
      timestamp: new Date().toISOString(),
      ...additionalProperties,
    };

    await analytics.track(eventName || 'Error Occurred', analyticsProperties);
  } catch {
    // Silently fail if analytics tracking fails - analytics should not block error handling
  }
};

/**
 * Global error handler that combines Sentry logging, Mixpanel tracking, and user feedback via Toast
 * @param error The error object
 * @param options Configuration options for error handling
 */
export const handleError = async (
  error: Error | string,
  options: ErrorOptions = {},
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Skip Sentry logging for expected authentication errors (wrong password, invalid credentials, etc.)
  const shouldSkipSentry = isExpectedAuthError(errorObj);
  const shouldCaptureSentry = opts.captureSentry && !shouldSkipSentry;

  try {
    if (shouldCaptureSentry) {
      captureInSentry(errorObj, opts.sentrySeverity, opts.sentryTags, opts.sentryExtra);
    }

    if (opts.trackAnalytics) {
      await trackErrorAnalytics(errorObj, opts.analyticsEventName, opts.analyticsProperties);
    }

    if (opts.showToast) {
      showToastMessage(errorObj, opts.toastMessage, opts.toastDuration, opts.toastType);
    }
  } catch (errorHandlingError) {
    // Error handling failed - this is a critical meta-failure
    // In development, throw the error to make it visible
    if (__DEV__) {
      throw new Error(
        `Error handling failed: ${errorHandlingError}. Original error: ${errorObj.message}`,
      );
    }
    // In production, silently continue
  }
};

/**
 * Higher-order function that wraps an async function with consistent error handling
 * @param fn - The async function to wrap
 * @param errorOptions - Options for error handling
 * @returns A wrapped function with error handling
 */
export const withErrorHandling = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  errorOptions: ErrorOptions = {},
) => {
  return async (...args: TArgs): Promise<TReturn | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error as Error, errorOptions);
      throw error; // Re-throw to allow caller to handle if needed
    }
  };
};

/**
 * Higher-order function that wraps an async function with error handling but returns a default value on error
 * @param fn - The async function to wrap
 * @param defaultValue - The default value to return on error
 * @param errorOptions - Options for error handling
 * @returns A wrapped function that returns default value on error
 */
export const withErrorHandlingDefault = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  defaultValue: TReturn,
  errorOptions: ErrorOptions = {},
) => {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error as Error, errorOptions);
      return defaultValue;
    }
  };
};
