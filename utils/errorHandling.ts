/* eslint-disable no-console */
import * as Sentry from '@sentry/react-native';

// Store toast handler globally - updated to support types
let globalToastHandler:
  | ((
      message: string,
      duration?: number,
      type?: 'info' | 'success' | 'error' | 'important'
    ) => void)
  | null = null;

// Function to set the toast handler (call this in your ToastProvider)
export const setGlobalToastHandler = (
  handler: (
    message: string,
    duration?: number,
    type?: 'info' | 'success' | 'error' | 'important'
  ) => void
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
  // Toast type for visual styling
  toastType?: 'info' | 'success' | 'error' | 'important';
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
  toastType: 'error', // Default to error type for error handler
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

const showToastMessage = (
  errorObj: Error,
  message?: string,
  duration?: number,
  type?: 'info' | 'success' | 'error' | 'important'
): void => {
  if (globalToastHandler) {
    const toastMessage = message || errorObj.message;
    globalToastHandler(toastMessage, duration, type);
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

    if (opts.showToast) {
      showToastMessage(errorObj, opts.toastMessage, opts.toastDuration, opts.toastType);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_handlingError) {
    // Silent fail if error handling itself fails
  }
};

// Pre-configured error handlers for common scenarios
export const handleAuthError = (error: Error | string): Promise<void> =>
  handleError(error, {
    toastMessage: 'Authentication error occurred',
    toastType: 'error',
    analyticsEventName: 'Auth_Error',
    sentrySeverity: 'warning',
  });

export const handleNetworkError = (error: Error | string): Promise<void> =>
  handleError(error, {
    toastMessage: 'Network error occurred',
    toastType: 'error',
    analyticsEventName: 'Network_Error',
    sentrySeverity: 'warning',
  });

export const handleAPIError = (error: Error | string): Promise<void> =>
  handleError(error, {
    toastMessage: 'Service temporarily unavailable',
    toastType: 'error',
    analyticsEventName: 'API_Error',
    sentrySeverity: 'error',
  });
