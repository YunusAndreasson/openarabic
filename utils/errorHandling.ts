/* eslint-disable no-console */
import * as Sentry from '@sentry/react-native';

// Store toast handler globally
let globalToastHandler: ((message: string, duration?: number) => void) | null = null;

// Function to set the toast handler (call this in your ToastProvider)
export const setGlobalToastHandler = (
  handler: (message: string, duration?: number) => void
): void => {
  globalToastHandler = handler;
};

interface ErrorOptions {
  // Whether to show a toast message to the user
  showToast?: boolean;
  // Custom toast message (if not provided, will use error.message)
  toastMessage?: string;
  // Toast duration in ms (default: 2500)
  toastDuration?: number;
  // Whether to track in Mixpanel
  trackAnalytics?: boolean;
  // Custom analytics event name (default: 'Error Occurred')
  analyticsEventName?: string;
  // Additional analytics properties
  analyticsProperties?: Record<string, string | number | boolean>;
  // Whether to capture in Sentry
  captureSentry?: boolean;
  // Sentry severity level
  sentrySeverity?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

const DEFAULT_OPTIONS: ErrorOptions = {
  showToast: true,
  trackAnalytics: true,
  captureSentry: true,
  sentrySeverity: 'error',
};

// Helper functions to reduce complexity
const captureInSentry = (errorObj: Error, sentrySeverity?: string): void => {
  if (sentrySeverity) {
    Sentry.withScope(scope => {
      scope.setLevel(sentrySeverity as Sentry.SeverityLevel);
      Sentry.captureException(errorObj);
    });
  } else {
    Sentry.captureException(errorObj);
  }
};

const trackInAnalytics = (errorObj: Error): void => {
  try {
    if (__DEV__) {
      console.error('Analytics error:', errorObj);
    }
  } catch (analyticsError) {
    if (__DEV__) {
      console.error('Failed to track error:', analyticsError);
    }
  }
};

const showToastMessage = (errorObj: Error, message?: string, duration?: number): void => {
  if (globalToastHandler) {
    const toastMessage = message || errorObj.message;
    globalToastHandler(toastMessage, duration);
  }
};

/**
 * Global error handler that combines Sentry logging, Mixpanel tracking, and user feedback via Toast
 * @param error The error object
 * @param options Configuration options for error handling
 */
export const handleError = async (
  error: Error | string,
  options: ErrorOptions = {}
): Promise<void> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  try {
    if (opts.captureSentry) {
      captureInSentry(errorObj, opts.sentrySeverity);
    }

    if (opts.trackAnalytics) {
      trackInAnalytics(errorObj);
    }

    if (opts.showToast) {
      showToastMessage(errorObj, opts.toastMessage, opts.toastDuration);
    }

    // Log to console in development
    if (__DEV__) {
      console.error(errorObj);
    }
  } catch (handlingError) {
    // If error handling itself fails, log to console in development
    if (__DEV__) {
      console.error('Error while handling error:', handlingError);
      console.error('Original error:', errorObj);
    }
  }
};

// Pre-configured error handlers for common scenarios
export const handleAuthError = (error: Error | string): Promise<void> =>
  handleError(error, {
    toastMessage: 'Authentication error occurred',
    analyticsEventName: 'Auth_Error',
    sentrySeverity: 'warning',
  });

export const handleNetworkError = (error: Error | string): Promise<void> =>
  handleError(error, {
    toastMessage: 'Network error occurred',
    analyticsEventName: 'Network_Error',
    sentrySeverity: 'warning',
  });

export const handleAPIError = (error: Error | string): Promise<void> =>
  handleError(error, {
    toastMessage: 'Service temporarily unavailable',
    analyticsEventName: 'API_Error',
    sentrySeverity: 'error',
  });
