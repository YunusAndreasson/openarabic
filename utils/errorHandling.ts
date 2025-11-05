import * as Sentry from '@sentry/react-native';

import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { analytics } from '@/services/analytics';
import { ToastType } from '@/types/enums';

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

  try {
    if (opts.captureSentry) {
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
