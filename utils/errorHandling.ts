import * as Sentry from '@sentry/react-native';
import { analytics } from '../services/analytics';
import { errorFeedback } from './haptics';

// Store toast handler globally
let globalToastHandler: ((message: string, duration?: number) => void) | null = null;

// Function to set the toast handler (call this in your ToastProvider)
export const setGlobalToastHandler = (handler: (message: string, duration?: number) => void) => {
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
  analyticsProperties?: Record<string, any>;
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
    // 1. Capture error in Sentry
    if (opts.captureSentry) {
      if (opts.sentrySeverity) {
        Sentry.withScope(scope => {
          scope.setLevel(opts.sentrySeverity!);
          Sentry.captureException(errorObj);
        });
      } else {
        Sentry.captureException(errorObj);
      }
    }

    // 2. Track error in Mixpanel
    if (opts.trackAnalytics) {
      await analytics.track(opts.analyticsEventName || 'Error Occurred', {
        error_message: errorObj.message,
        error_name: errorObj.name,
        error_stack: errorObj.stack,
        ...opts.analyticsProperties,
      });
    }

    // 3. Show toast message to user
    if (opts.showToast && globalToastHandler) {
      const message = opts.toastMessage || errorObj.message;
      globalToastHandler(message, opts.toastDuration);
    }

    // 4. Trigger error haptic feedback
    errorFeedback();

    // 5. Log to console in development
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
export const handleAuthError = (error: Error | string) =>
  handleError(error, {
    toastMessage: 'Authentication error occurred',
    analyticsEventName: 'Auth_Error',
    sentrySeverity: 'warning',
  });

export const handleNetworkError = (error: Error | string) =>
  handleError(error, {
    toastMessage: 'Network error occurred',
    analyticsEventName: 'Network_Error',
    sentrySeverity: 'warning',
  });

export const handleAPIError = (error: Error | string) =>
  handleError(error, {
    toastMessage: 'Service temporarily unavailable',
    analyticsEventName: 'API_Error',
    sentrySeverity: 'error',
  });
