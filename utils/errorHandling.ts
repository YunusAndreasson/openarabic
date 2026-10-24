import * as Sentry from '@sentry/react-native';

import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { analytics } from '@/services/analytics';
import { ToastType } from '@/types/enums';
import { toError } from '@/utils/toError';

// Re-exported so the many `import { toError } from '@/utils/errorHandling'`
// sites keep working; leaf modules import '@/utils/toError' directly.
export { toError };

/**
 * Leave a breadcrumb on the Sentry trail.
 *
 * Thirty-nine call sites wrote out the same five-line object literal, varying
 * only the message, the data and (rarely) the level. Only three categories have
 * ever existed, so they are named rather than free text — a typo'd category is
 * a breadcrumb that silently falls out of the filter you search by.
 *
 * Fire-and-forget, like the haptics helpers: a breadcrumb is diagnostic, never
 * something the user or the caller can act on.
 */
type BreadcrumbCategory = 'auth' | 'voice' | 'preloader';

export const breadcrumb = (
  category: BreadcrumbCategory,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.Breadcrumb['level'] = 'info',
): void => {
  Sentry.addBreadcrumb({ category, level, message, ...(data ? { data } : {}) });
};

export const authBreadcrumb = (
  message: string,
  data?: Record<string, unknown>,
  level?: Sentry.Breadcrumb['level'],
): void => breadcrumb('auth', message, data, level);

export const voiceBreadcrumb = (
  message: string,
  data?: Record<string, unknown>,
  level?: Sentry.Breadcrumb['level'],
): void => breadcrumb('voice', message, data, level);

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

/**
 * The severity levels this app reports errors at.
 *
 * Derived from Sentry's own union rather than re-typed, because the value is
 * handed straight to `scope.setLevel` — spelled out by hand it had to be cast
 * back (`as Sentry.SeverityLevel`) at the one place it was used, which is
 * exactly where a level the SDK stopped recognising would have gone through
 * silently. `log` is excluded: an error is never merely a log line.
 */
export type ErrorSeverityLevel = Exclude<Sentry.SeverityLevel, 'log'>;

/**
 * Every knob `handleError` understands — and the ONE error-config shape in the
 * app.
 *
 * `executeQuery` and the service-config factory each used to declare their own
 * near-copy of this list, re-typing the severity union a third and fourth time
 * and then hand-copying seven fields across at the boundary. A field added here
 * simply didn't reach `handleError` through those copies; a field whose type
 * changed didn't fail to compile either, because the copy was rewritten by
 * hand. They now `Pick` from this, so both are checked against it.
 */
export interface ErrorOptions {
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
  /**
   * Error-taxonomy event name (default: 'Error Occurred').
   *
   * Deliberately a free string, unlike the product events in
   * `ANALYTICS_EVENTS`: these name a failure at one call site
   * ('Password_Reset_Error'), are read as a Sentry/Mixpanel prefix search
   * rather than selected from a list, and enumerating all ~40 of them would
   * turn every new `catch` block into a two-file change.
   */
  analyticsEventName?: string;
  // Additional analytics properties
  analyticsProperties?: Record<string, boolean | number | string>;
  // Whether to capture in Sentry
  captureSentry?: boolean;
  // Sentry severity level
  sentrySeverity?: ErrorSeverityLevel;
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
 * Merge that treats an explicitly-undefined value as "not provided".
 *
 * A plain `{ ...DEFAULT_OPTIONS, ...options }` does NOT do this: object spread
 * copies every own key regardless of its value, so `{ showToast: undefined }`
 * overwrites the `true` default with `undefined` and the toast is silently
 * skipped. `exactOptionalPropertyTypes` is off, so `showToast?: boolean` accepts
 * an explicit `undefined` and the compiler never objects.
 *
 * That is easy to reach without meaning to. `executeQuery` forwards its caller's
 * `ErrorOptions` straight through, so any call site passing a `boolean | undefined`
 * flag — a prop, a config lookup, an optional argument — swallows its own error
 * toast, and `sentrySeverity: undefined` downgrades the Sentry event instead of
 * defaulting to 'error'.
 *
 * Fixed here rather than at the forwarding call sites: every caller of
 * `handleError` has the same exposure, and the defaults are only meaningful if
 * absence and explicit-undefined mean the same thing.
 */
function applyDefaults(defaults: ErrorOptions, overrides: ErrorOptions): ErrorOptions {
  const merged: ErrorOptions = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof ErrorOptions)[]) {
    if (overrides[key] !== undefined) {
      // Index-assignment across a union of value types needs the widening cast;
      // the key/value pair is guaranteed to line up because both sides are
      // `ErrorOptions` and the key came from `overrides` itself.
      (merged as Record<string, unknown>)[key] = overrides[key];
    }
  }
  return merged;
}

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

/**
 * Connectivity failures that say only "this user was offline".
 *
 * They are unactionable — no build fixes a train tunnel — and they crowd the
 * issue list, where volume is the signal we actually triage on. Suppressed for
 * Sentry ONLY: the caller's toast still fires, so the user is still told why
 * nothing loaded.
 *
 * Deliberately NOT suppressed: AbortError / FetchRequestCanceledException. Those
 * are usually OUR 20s fetch timeout firing (supabase-js ships no timeout of its
 * own), and a socket that goes dead often enough to trip it is a real report.
 */
const isExpectedNetworkError = (error: Error): boolean => {
  // supabase-js marks these retryable and retries them itself.
  if (error.name === 'AuthRetryableFetchError') {
    return true;
  }

  const message = error.message?.toLowerCase() || '';
  return [
    'unable to resolve host', // Android DNS, no connection
    'unknownhostexception',
    'the internet connection appears to be offline', // iOS URLSession
    'the network connection was lost',
    'network request failed', // React Native's generic fetch failure
  ].some(pattern => message.includes(pattern));
};

// Helper functions to reduce complexity
const captureInSentry = (
  errorObj: Error,
  sentrySeverity?: ErrorSeverityLevel,
  sentryTags?: Record<string, string>,
  sentryExtra?: Record<string, unknown>,
): void => {
  try {
    Sentry.withScope(scope => {
      if (sentrySeverity) {
        scope.setLevel(sentrySeverity);
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

    await analytics.trackError(eventName || 'Error Occurred', analyticsProperties);
  } catch {
    // Silently fail if analytics tracking fails - analytics should not block error handling
  }
};

/**
 * Global error handler that combines Sentry logging, Mixpanel tracking, and user feedback via Toast
 * @param error The error object
 * @param options Configuration options for error handling
 */
export const handleError = async (error: unknown, options: ErrorOptions = {}): Promise<void> => {
  const opts = applyDefaults(DEFAULT_OPTIONS, options);
  // Accepts `unknown` so catch blocks can hand the raw value straight over.
  // Normalising here (rather than at ~19 call sites doing
  // `e instanceof Error ? e : String(e)`) is what stops a thrown object becoming
  // the literal Sentry title "Error: [object Object]".
  const errorObj = toError(error);

  // Skip Sentry logging for expected authentication errors (wrong password, invalid credentials, etc.)
  const shouldSkipSentry = isExpectedAuthError(errorObj) || isExpectedNetworkError(errorObj);
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
        `Error handling failed: ${toError(errorHandlingError).message}. Original error: ${errorObj.message}`,
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
      await handleError(error, errorOptions);
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
      await handleError(error, errorOptions);
      return defaultValue;
    }
  };
};
