/**
 * Background Tasks Service Tests
 *
 * Tests the background tasks service which handles background fetch for due words.
 * This service is a thin wrapper around Expo Background Task APIs.
 *
 * Focus: Error handling, graceful degradation
 * Note: TaskManager.defineTask runs at module level and is hard to test
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
import { registerBackgroundTasks, unregisterBackgroundTasks } from '@/services/backgroundTasks';
import { handleError } from '@/utils/errorHandling';

// Type-safe mocks
const mockGetStatusAsync = jest.mocked(BackgroundTask.getStatusAsync);
const mockRegisterTaskAsync = jest.mocked(BackgroundTask.registerTaskAsync);
const mockUnregisterTaskAsync = jest.mocked(BackgroundTask.unregisterTaskAsync);
const mockHandleError = jest.mocked(handleError);

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
