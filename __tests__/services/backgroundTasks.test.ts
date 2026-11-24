/**
 * Background Tasks Service Tests
 *
 * Tests the background tasks service which handles background fetch for due words.
 * This service is a thin wrapper around Expo Background Task APIs.
 *
 * Focus: Error handling, graceful degradation
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies before imports
jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: {
    Success: 'Success',
    Failed: 'Failed',
  },
  BackgroundTaskStatus: {
    Available: 1,
    Unavailable: 2,
    Denied: 3,
  },
  getStatusAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

// backgroundTasks imports the notification service (module init registers the
// expo notification handler) and the prefs mirror (AsyncStorage) — stub both.
jest.mock('@/services/notificationService', () => ({
  setAppBadgeCount: jest.fn(async (..._args: unknown[]) => true),
  syncReminderPlan: jest.fn(async (..._args: unknown[]) => 0),
}));

jest.mock('@/utils/smartReminderPrefs', () => ({
  readSmartReminderPrefs: jest.fn(async (..._args: unknown[]) => null),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(), // Called at module level, just needs to not throw
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(),
  },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// Import after mocks
import * as BackgroundTask from 'expo-background-task';
import { defineTask } from 'expo-task-manager';
import { submitPublicWidget } from '@/services/widgets/publicHost';
jest.mock('@/services/widgets/publicHost', () => ({ submitPublicWidget: jest.fn() }));
import { clearWordWidget } from '@/services/widgets/publish';
import { supabase } from '@/services/supabase';
jest.mock('@/services/widgets/publish', () => ({ clearWordWidget: jest.fn() }));
import { registerBackgroundTasks, unregisterBackgroundTasks } from '@/services/backgroundTasks';
import { handleError } from '@/utils/errorHandling';

// Type-safe mocks
const mockGetStatusAsync = jest.mocked(BackgroundTask.getStatusAsync);
const mockRegisterTaskAsync = jest.mocked(BackgroundTask.registerTaskAsync);
const mockUnregisterTaskAsync = jest.mocked(BackgroundTask.unregisterTaskAsync);
const mockHandleError = jest.mocked(handleError);

// Capture the native registration before Jest resets call histories between tests.
const [taskName, runHeadless] = jest.mocked(defineTask).mock.calls[0]!;
test.each([false, true])(
  'sessionless headless launch repairs the widget only after a definitive session read (error=%s)',
  async failed => {
    const { AuthError } =
      jest.requireActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValue(
        failed
          ? { data: { session: null }, error: new AuthError('refresh unavailable') }
          : { data: { session: null }, error: null },
      );
    await runHeadless({ data: {}, error: null, executionInfo: { taskName, eventId: 'headless' } });
    expect(clearWordWidget).toHaveBeenCalledTimes(failed ? 0 : 1);
  },
);

test('sessionless repair replaces the launcher copy before its queued renderer can die', async () => {
  jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
  let displayed = 'private';
  jest.mocked(submitPublicWidget).mockImplementation(async (_name, word) => {
    displayed = word;
  });
  await runHeadless({ data: {}, error: null, executionInfo: { taskName, eventId: 'cold' } });
  expect(clearWordWidget).toHaveBeenCalled();
  expect(displayed).not.toBe('private');
});

describe('backgroundTasks service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerBackgroundTasks', () => {
    test('registers straight away: the module checks availability itself', async () => {
      // registerTaskAsync returns early when the status is Restricted or the
      // task is already registered, so a getStatusAsync pre-check was a
      // second native round trip for the same answer.
      mockRegisterTaskAsync.mockResolvedValue(undefined);

      await registerBackgroundTasks();

      expect(mockGetStatusAsync).not.toHaveBeenCalled();
      expect(mockRegisterTaskAsync).toHaveBeenCalledWith('background-due-words-calculation', {
        minimumInterval: 15,
      });
    });

    test('should silently ignore the module\'s "not configured" error', async () => {
      // The message expo-background-task throws (ios/BackgorundTaskExceptions.swift)
      // when the build lacks the `processing` background mode.
      mockRegisterTaskAsync.mockRejectedValue(
        new Error(
          "Background Task has not been configured. To enable it, add `process` to `UIBackgroundModes` in the application's Info.plist file",
        ),
      );

      await registerBackgroundTasks();

      // Should not call handleError for configuration errors
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('should silently ignore UIBackgroundModes errors', async () => {
      mockRegisterTaskAsync.mockRejectedValue(
        new Error('UIBackgroundModes not configured in Info.plist'),
      );

      await registerBackgroundTasks();

      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('should log other errors with warning severity', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockRegisterTaskAsync.mockRejectedValue(unexpectedError);

      await registerBackgroundTasks();

      expect(mockHandleError).toHaveBeenCalledWith(unexpectedError, {
        showToast: false,
        analyticsEventName: 'Background_Task_Registration_Error',
        sentrySeverity: 'warning',
      });
    });
  });

  describe('unregisterBackgroundTasks', () => {
    test('should unregister task successfully', async () => {
      mockUnregisterTaskAsync.mockResolvedValue(undefined);

      await unregisterBackgroundTasks();

      expect(mockUnregisterTaskAsync).toHaveBeenCalledWith('background-due-words-calculation');
    });

    test('should handle unregistration errors', async () => {
      const error = new Error('Unregister failed');
      mockUnregisterTaskAsync.mockRejectedValue(error);

      await unregisterBackgroundTasks();

      expect(mockHandleError).toHaveBeenCalledWith(error, {
        showToast: false,
        analyticsEventName: 'Background_Task_Unregistration_Error',
      });
    });
  });

  describe('Error handling patterns', () => {
    test('should never throw errors to caller', async () => {
      mockRegisterTaskAsync.mockRejectedValue(new Error('Test'));
      mockUnregisterTaskAsync.mockRejectedValue(new Error('Test'));

      // All should resolve without throwing
      await expect(registerBackgroundTasks()).resolves.not.toThrow();
      await expect(unregisterBackgroundTasks()).resolves.not.toThrow();
    });
  });
});
