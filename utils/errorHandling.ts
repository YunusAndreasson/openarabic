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
  console.log('[DEBUG] Capturing error in Sentry:', errorObj.message);
  if (sentrySeverity) {
    Sentry.withScope(scope => {
      scope.setLevel(sentrySeverity as Sentry.SeverityLevel);
      Sentry.captureException(errorObj);
    });
  } else {
    Sentry.captureException(errorObj);
  }
};

const trackInAnalytics = (_errorObj: Error): void => {
  try {
    console.log('[DEBUG] Would track error in analytics');
    // Analytics tracking logic would go here
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_analyticsError) {
    // Silent fail if analytics tracking fails
    console.error('[DEBUG] Failed to track error in analytics');
  }
};

const showToastMessage = (errorObj: Error, message?: string, duration?: number): void => {
  console.log('[DEBUG] Attempting to show toast message:', message || errorObj.message);
  console.log('[DEBUG] Toast handler available:', !!globalToastHandler);
  if (globalToastHandler) {
    const toastMessage = message || errorObj.message;
    globalToastHandler(toastMessage, duration);
  } else {
    console.error('[DEBUG] No toast handler set, error message not displayed to user');
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

  console.log('[DEBUG] handleError called with message:', errorObj.message);
  console.log('[DEBUG] Error options:', JSON.stringify(opts));

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_handlingError) {
    // Silent fail if error handling itself fails
    console.error('[DEBUG] Error occurred within handleError itself');
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
