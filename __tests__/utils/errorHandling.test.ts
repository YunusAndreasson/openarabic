/**
 * Modern Jest 29+ test for errorHandling utility
 * Tests critical error handling infrastructure used throughout the app
 */

import { describe, expect, jest, test, beforeEach } from '@jest/globals';

import {
  setGlobalToastHandler,
  showSuccessToast,
  handleError,
  toError,
} from '@/utils/errorHandling';
import { ToastType } from '@/types/enums';

// Mock dependencies
jest.mock('@sentry/react-native');
jest.mock('@/services/analytics');

const Sentry = require('@sentry/react-native');
const { analytics } = require('@/services/analytics');

describe('errorHandling utility', () => {
  let mockToastHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset global toast handler
    mockToastHandler = jest.fn();
    setGlobalToastHandler(mockToastHandler);

    // Mock Sentry
    jest.mocked(Sentry.withScope).mockImplementation((callback: (scope: any) => void) => {
      const mockScope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtra: jest.fn(),
      };
      callback(mockScope);
    });
    jest.mocked(Sentry.captureException).mockImplementation(() => 'event-id');

    // Mock analytics
    jest.mocked(analytics.track).mockResolvedValue(undefined);
  });

  describe('setGlobalToastHandler', () => {
    test('sets global toast handler', () => {
      const handler = jest.fn();
      setGlobalToastHandler(handler);

      showSuccessToast('Test message');

      expect(handler).toHaveBeenCalledWith('Test message', expect.any(Number), ToastType.SUCCESS);
    });

    test('replaces existing toast handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      setGlobalToastHandler(handler1);
      setGlobalToastHandler(handler2);

      showSuccessToast('Test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('showSuccessToast', () => {
    test('shows success toast with default duration', () => {
      showSuccessToast('Success message');

      expect(mockToastHandler).toHaveBeenCalledWith(
        'Success message',
        expect.any(Number),
        ToastType.SUCCESS,
      );
    });

    test('shows success toast with custom duration', () => {
      showSuccessToast('Success message', 5000);

      expect(mockToastHandler).toHaveBeenCalledWith('Success message', 5000, ToastType.SUCCESS);
    });

    test('does not throw if toast handler not set', () => {
      setGlobalToastHandler(null as any);

      expect(() => {
        showSuccessToast('Test');
      }).not.toThrow();
    });
  });

  describe('handleError - Basic Functionality', () => {
    test('handles Error object', async () => {
      const error = new Error('Test error');

      await handleError(error);

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith(
        'Error Occurred',
        expect.objectContaining({
          errorMessage: 'Test error',
        }),
      );
      expect(mockToastHandler).toHaveBeenCalledWith('Test error', undefined, ToastType.ERROR);
    });

    test('handles string error', async () => {
      await handleError('String error');

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalledWith(
        'Error Occurred',
        expect.objectContaining({
          errorMessage: 'String error',
        }),
      );
      expect(mockToastHandler).toHaveBeenCalledWith('String error', undefined, ToastType.ERROR);
    });
  });

  describe('handleError - Toast Options', () => {
    test('disables toast when showToast is false', async () => {
      await handleError(new Error('Test'), { showToast: false });

      expect(mockToastHandler).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled(); // Still captures in Sentry
    });

    test('uses custom toast message', async () => {
      await handleError(new Error('Technical error'), {
        toastMessage: 'User-friendly message',
      });

      expect(mockToastHandler).toHaveBeenCalledWith(
        'User-friendly message',
        undefined,
        ToastType.ERROR,
      );
    });

    test('uses custom toast duration', async () => {
      await handleError(new Error('Test'), {
        toastDuration: 5000,
      });

      expect(mockToastHandler).toHaveBeenCalledWith('Test', 5000, ToastType.ERROR);
    });

    test('uses custom toast type', async () => {
      await handleError(new Error('Test'), {
        toastType: ToastType.INFO,
      });

      expect(mockToastHandler).toHaveBeenCalledWith('Test', undefined, ToastType.INFO);
    });
  });

  describe('handleError - Sentry Options', () => {
    test('disables Sentry capture when captureSentry is false', async () => {
      await handleError(new Error('Test'), { captureSentry: false });

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalled(); // Still tracks in analytics
    });

    test('sets Sentry severity level', async () => {
      await handleError(new Error('Test'), {
        sentrySeverity: 'warning',
      });

      expect(Sentry.withScope).toHaveBeenCalled();
      // Verify setLevel was called within the scope
      const scopeCallback = jest.mocked(Sentry.withScope).mock.calls[0][0];
      const mockScope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtra: jest.fn(),
      };
      scopeCallback(mockScope);
      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
    });

    test('sets Sentry tags', async () => {
      await handleError(new Error('Test'), {
        sentryTags: { location: 'auth', action: 'login' },
      });

      const scopeCallback = jest.mocked(Sentry.withScope).mock.calls[0][0];
      const mockScope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtra: jest.fn(),
      };
      scopeCallback(mockScope);
      expect(mockScope.setTag).toHaveBeenCalledWith('location', 'auth');
      expect(mockScope.setTag).toHaveBeenCalledWith('action', 'login');
    });

    test('sets Sentry extra context', async () => {
      await handleError(new Error('Test'), {
        sentryExtra: { userId: 'user-123', attemptCount: 3 },
      });

      const scopeCallback = jest.mocked(Sentry.withScope).mock.calls[0][0];
      const mockScope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtra: jest.fn(),
      };
      scopeCallback(mockScope);
      expect(mockScope.setExtra).toHaveBeenCalledWith('userId', 'user-123');
      expect(mockScope.setExtra).toHaveBeenCalledWith('attemptCount', 3);
    });

    test('handles Sentry failure gracefully', async () => {
      jest.mocked(Sentry.captureException).mockImplementation(() => {
        throw new Error('Sentry failed');
      });

      // Should not throw despite Sentry failure
      await expect(handleError(new Error('Test'))).resolves.not.toThrow();

      // Should still attempt analytics and toast
      expect(analytics.track).toHaveBeenCalled();
      expect(mockToastHandler).toHaveBeenCalled();
    });
  });

  describe('handleError - Analytics Options', () => {
    test('disables analytics when trackAnalytics is false', async () => {
      await handleError(new Error('Test'), { trackAnalytics: false });

      expect(analytics.track).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled(); // Still captures in Sentry
    });

    test('uses custom analytics event name', async () => {
      await handleError(new Error('Test'), {
        analyticsEventName: 'Login Failed',
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'Login Failed',
        expect.objectContaining({
          errorMessage: 'Test',
        }),
      );
    });

    test('includes additional analytics properties', async () => {
      await handleError(new Error('Test'), {
        analyticsProperties: {
          screen: 'login',
          attemptNumber: 3,
          hasNetwork: true,
        },
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'Error Occurred',
        expect.objectContaining({
          errorMessage: 'Test',
          screen: 'login',
          attemptNumber: 3,
          hasNetwork: true,
        }),
      );
    });

    test('includes error name and stack in analytics', async () => {
      const error = new Error('Test error');
      error.name = 'CustomError';

      await handleError(error);

      expect(analytics.track).toHaveBeenCalledWith(
        'Error Occurred',
        expect.objectContaining({
          errorMessage: 'Test error',
          errorName: 'CustomError',
          errorStack: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });

    test('limits stack trace length to 500 characters', async () => {
      const error = new Error('Test');
      error.stack = 'a'.repeat(1000);

      await handleError(error);

      const analyticsCall = jest.mocked(analytics.track).mock.calls[0];
      const properties = analyticsCall[1] as any;
      expect(properties.errorStack.length).toBeLessThanOrEqual(500);
    });

    test('handles analytics failure gracefully', async () => {
      jest.mocked(analytics.track).mockRejectedValue(new Error('Analytics failed'));

      // Should not throw despite analytics failure
      await expect(handleError(new Error('Test'))).resolves.not.toThrow();

      // Should still attempt Sentry and toast
      expect(Sentry.captureException).toHaveBeenCalled();
      expect(mockToastHandler).toHaveBeenCalled();
    });
  });

  describe('handleError - Combined Options', () => {
    test('respects all options together', async () => {
      await handleError(new Error('Test'), {
        showToast: true,
        toastMessage: 'Custom message',
        toastDuration: 3000,
        toastType: ToastType.WARNING,
        trackAnalytics: true,
        analyticsEventName: 'Custom Event',
        analyticsProperties: { prop: 'value' },
        captureSentry: true,
        sentrySeverity: 'warning',
        sentryTags: { tag: 'value' },
        sentryExtra: { extra: 'data' },
      });

      expect(mockToastHandler).toHaveBeenCalledWith('Custom message', 3000, ToastType.WARNING);
      expect(analytics.track).toHaveBeenCalledWith(
        'Custom Event',
        expect.objectContaining({ prop: 'value' }),
      );
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    test('disables everything when all flags are false', async () => {
      await handleError(new Error('Test'), {
        showToast: false,
        trackAnalytics: false,
        captureSentry: false,
      });

      expect(mockToastHandler).not.toHaveBeenCalled();
      expect(analytics.track).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('handleError - Error Handling Edge Cases', () => {
    test('handles error without message', async () => {
      const error = new Error();

      await handleError(error);

      expect(mockToastHandler).toHaveBeenCalledWith('', undefined, ToastType.ERROR);
      expect(analytics.track).toHaveBeenCalledWith(
        'Error Occurred',
        expect.objectContaining({
          errorMessage: '',
        }),
      );
    });

    test('handles error without stack', async () => {
      const error = new Error('Test');
      delete error.stack;

      await handleError(error);

      expect(analytics.track).toHaveBeenCalledWith(
        'Error Occurred',
        expect.objectContaining({
          errorMessage: 'Test',
          errorStack: undefined,
        }),
      );
    });

    test('handles empty string error', async () => {
      await handleError('');

      expect(Sentry.captureException).toHaveBeenCalled();
      expect(mockToastHandler).toHaveBeenCalledWith('', undefined, ToastType.ERROR);
    });

    test('handles error when toast handler not set', async () => {
      setGlobalToastHandler(null as any);

      await expect(handleError(new Error('Test'))).resolves.not.toThrow();

      // Should still attempt Sentry and analytics
      expect(Sentry.captureException).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalled();
    });
  });

  describe('handleError - Default Options', () => {
    test('uses default options when none provided', async () => {
      await handleError(new Error('Test'));

      // All features enabled by default
      expect(mockToastHandler).toHaveBeenCalled();
      expect(analytics.track).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();

      // Default toast type is ERROR
      expect(mockToastHandler).toHaveBeenCalledWith('Test', undefined, ToastType.ERROR);
    });

    test('default analytics event name is "Error Occurred"', async () => {
      await handleError(new Error('Test'));

      expect(analytics.track).toHaveBeenCalledWith('Error Occurred', expect.any(Object));
    });

    test('default Sentry severity is "error"', async () => {
      await handleError(new Error('Test'));

      const scopeCallback = jest.mocked(Sentry.withScope).mock.calls[0][0];
      const mockScope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtra: jest.fn(),
      };
      scopeCallback(mockScope);
      expect(mockScope.setLevel).toHaveBeenCalledWith('error');
    });
  });

  describe('handleError - Async Behavior', () => {
    test('returns a promise', () => {
      const result = handleError(new Error('Test'));
      expect(result).toBeInstanceOf(Promise);
    });

    test('waits for analytics to complete', async () => {
      let analyticsResolved = false;
      jest.mocked(analytics.track).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        analyticsResolved = true;
      });

      await handleError(new Error('Test'));

      expect(analyticsResolved).toBeTruthy();
    });
  });

  // Regression: a thrown non-Error used to be stringified into the message.
  // `String(obj)` produced the Sentry title "Error: [object Object]", and
  // JSON.stringify-ing a rejected query's payload produced a ~100KB title made of
  // article JSON — which Sentry grouped per-payload, opening a new issue each time.
  describe('toError - non-Error normalisation', () => {
    test('returns an Error unchanged', () => {
      const original = new Error('boom');
      expect(toError(original)).toBe(original);
    });

    test('treats a string as a deliberate message', () => {
      expect(toError('something failed').message).toBe('something failed');
    });

    test('uses a message property when present (Supabase-style errors)', () => {
      expect(toError({ message: 'JWT expired', code: '401' }).message).toBe('JWT expired');
    });

    test('describes a thrown array by shape, never its contents', () => {
      const articles = [
        { id: 577, title: 'Public Preaching', summary: 'x'.repeat(500) },
        { id: 576, title: 'Stories of Prophetic Judgments', summary: 'y'.repeat(500) },
      ];

      const { message } = toError(articles);

      expect(message).toBe('Non-Error thrown: Array(2)');
      expect(message).not.toContain('Public Preaching');
    });

    test('describes a thrown plain object instead of "[object Object]"', () => {
      expect(toError({ status: 500 }).message).toBe('Non-Error thrown: Object');
      expect(toError({}).message).not.toContain('[object Object]');
    });

    test('handles null and undefined distinctly', () => {
      expect(toError(null).message).toBe('Non-Error thrown: null');
      expect(toError(undefined).message).toBe('Non-Error thrown: undefined');
    });

    test('bounds an over-long message so a payload can never become the title', () => {
      expect(toError('x'.repeat(5000)).message).toHaveLength(200);
      expect(toError({ message: 'y'.repeat(5000) }).message).toHaveLength(200);
    });

    test('handleError normalises a thrown object before reporting it', async () => {
      await handleError({ unexpected: 'shape' }, { showToast: false });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Non-Error thrown: Object' }),
      );
    });
  });
});
