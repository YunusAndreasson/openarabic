import { handleError, setGlobalToastHandler } from '@/utils/errorHandling';

// Mock dependencies
const mockAnalyticsTrack = jest.fn();
jest.mock('@/services/analytics', () => ({
  analytics: {
    track: mockAnalyticsTrack,
  },
}));

const mockSentryAddBreadcrumb = jest.fn();
const mockSentryCaptureException = jest.fn();
const mockSentryWithScope = jest.fn();
const mockSentrySetTag = jest.fn();
const mockSentrySetContext = jest.fn();
const mockSentrySetLevel = jest.fn();

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: mockSentryAddBreadcrumb,
  captureException: mockSentryCaptureException,
  withScope: mockSentryWithScope,
  setTag: mockSentrySetTag,
  setContext: mockSentrySetContext,
  setLevel: mockSentrySetLevel,
}));

const mockToastHandler = jest.fn();

describe('errorHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSentryWithScope.mockImplementation(callback => callback());
    setGlobalToastHandler(mockToastHandler);
  });

  describe('handleError', () => {
    const testError = new Error('Test error message');

    it('shows toast with custom message when provided', async () => {
      await handleError(testError, {
        toastMessage: 'Custom error message',
      });

      expect(mockToastHandler).toHaveBeenCalledWith('Custom error message', 2500, 'error');
    });

    it('shows toast with error message when no custom message provided', async () => {
      await handleError(testError, { showToast: true });

      expect(mockToastHandler).toHaveBeenCalledWith('Test error message', 2500, 'error');
    });

    it('does not show toast when showToast is false', async () => {
      await handleError(testError, { showToast: false });

      expect(mockToastHandler).not.toHaveBeenCalled();
    });

    it('tracks analytics event with custom name', async () => {
      await handleError(testError, {
        analyticsEventName: 'Custom_Error_Event',
      });

      expect(mockAnalyticsTrack).toHaveBeenCalledWith('Custom_Error_Event', {
        error_message: 'Test error message',
        error_name: 'Error',
      });
    });

    it('tracks analytics event with default name when none provided', async () => {
      await handleError(testError, { captureAnalytics: true });

      expect(mockAnalyticsTrack).toHaveBeenCalledWith('Error_Handled', {
        error_message: 'Test error message',
        error_name: 'Error',
      });
    });

    it('does not track analytics when captureAnalytics is false', async () => {
      await handleError(testError, { captureAnalytics: false });

      expect(mockAnalyticsTrack).not.toHaveBeenCalled();
    });

    it('captures Sentry exception with default severity', async () => {
      await handleError(testError);

      expect(mockSentryCaptureException).toHaveBeenCalledWith(testError);
      expect(mockSentrySetLevel).toHaveBeenCalledWith('error');
    });

    it('captures Sentry exception with custom severity', async () => {
      await handleError(testError, {
        sentrySeverity: 'warning',
      });

      expect(mockSentryCaptureException).toHaveBeenCalledWith(testError);
      expect(mockSentrySetLevel).toHaveBeenCalledWith('warning');
    });

    it('does not capture Sentry exception when captureSentry is false', async () => {
      await handleError(testError, { captureSentry: false });

      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });

    it('sets Sentry tags when provided', async () => {
      await handleError(testError, {
        sentryTags: {
          feature: 'authentication',
          version: '1.0.0',
        },
      });

      expect(mockSentrySetTag).toHaveBeenCalledWith('feature', 'authentication');
      expect(mockSentrySetTag).toHaveBeenCalledWith('version', '1.0.0');
    });

    it('sets Sentry context when provided', async () => {
      await handleError(testError, {
        sentryExtra: {
          userId: '123',
          requestId: 'req-456',
        },
      });

      expect(mockSentrySetContext).toHaveBeenCalledWith('Extra Context', {
        userId: '123',
        requestId: 'req-456',
      });
    });

    it('adds Sentry breadcrumb when enabled', async () => {
      await handleError(testError, {
        addBreadcrumb: true,
        analyticsEventName: 'Custom_Error',
      });

      expect(mockSentryAddBreadcrumb).toHaveBeenCalledWith({
        message: 'Error handled',
        category: 'error',
        level: 'error',
        data: {
          error_message: 'Test error message',
          error_name: 'Error',
          event_name: 'Custom_Error',
        },
      });
    });

    it('does not add breadcrumb when addBreadcrumb is false', async () => {
      await handleError(testError, { addBreadcrumb: false });

      expect(mockSentryAddBreadcrumb).not.toHaveBeenCalled();
    });

    it('handles string errors by converting to Error objects', async () => {
      await handleError('String error message');

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'String error message',
        })
      );
    });

    it('uses all default options when no options provided', async () => {
      await handleError(testError);

      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Test error message',
        })
      );
      expect(mockAnalyticsTrack).toHaveBeenCalledWith('Error_Handled', expect.any(Object));
      expect(mockSentryCaptureException).toHaveBeenCalledWith(testError);
    });

    it('handles errors in error handling gracefully', async () => {
      mockSentryCaptureException.mockImplementationOnce(() => {
        throw new Error('Sentry capture failed');
      });

      // Should not throw even if Sentry fails
      await expect(handleError(testError)).resolves.not.toThrow();
    });

    it('handles complex error objects with additional properties', async () => {
      const complexError = new Error('Complex error');
      (complexError as any).code = 'AUTH_FAILED';
      (complexError as any).statusCode = 401;

      await handleError(complexError, {
        sentryExtra: {
          errorCode: (complexError as any).code,
          statusCode: (complexError as any).statusCode,
        },
      });

      expect(mockSentrySetContext).toHaveBeenCalledWith('Extra Context', {
        errorCode: 'AUTH_FAILED',
        statusCode: 401,
      });
    });
  });
});
