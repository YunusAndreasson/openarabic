/**
 * Background Tasks Service Tests
 *
 * Tests the background tasks service which handles background fetch for due words.
 * This service is a thin wrapper around Expo Background Task APIs.
 *
 * Focus: Error handling, availability checking, graceful degradation
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
import {
  registerBackgroundTasks,
  unregisterBackgroundTasks,
  isBackgroundTaskAvailable,
} from '@/services/backgroundTasks';
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

  describe('isBackgroundTaskAvailable', () => {
    test('should return true when background task is available', async () => {
      mockGetStatusAsync.mockResolvedValue(1); // Available status

      const result = await isBackgroundTaskAvailable();

      expect(result).toBeTruthy();
      expect(mockGetStatusAsync).toHaveBeenCalled();
    });

    test('should return false when background task is unavailable', async () => {
      mockGetStatusAsync.mockResolvedValue(2); // Unavailable status

      const result = await isBackgroundTaskAvailable();

      expect(result).toBeFalsy();
    });

    test('should return false when getStatusAsync throws error', async () => {
      mockGetStatusAsync.mockRejectedValue(new Error('Not configured'));

      const result = await isBackgroundTaskAvailable();

      expect(result).toBeFalsy();
    });

    test('should handle error gracefully without logging', async () => {
      mockGetStatusAsync.mockRejectedValue(new Error('Test error'));

      await isBackgroundTaskAvailable();

      // Should not call handleError (catches silently)
      expect(mockHandleError).not.toHaveBeenCalled();
    });
  });

  describe('registerBackgroundTasks', () => {
    test('should register task when available', async () => {
      mockGetStatusAsync.mockResolvedValue(1); // Available
      mockRegisterTaskAsync.mockResolvedValue(undefined);

      await registerBackgroundTasks();

      expect(mockGetStatusAsync).toHaveBeenCalled();
      expect(mockRegisterTaskAsync).toHaveBeenCalledWith('background-due-words-calculation', {
        minimumInterval: 15,
      });
    });

    test('should skip registration when background task unavailable', async () => {
      mockGetStatusAsync.mockResolvedValue(2); // Unavailable

      await registerBackgroundTasks();

      expect(mockGetStatusAsync).toHaveBeenCalled();
      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
    });

    test('should silently ignore "not configured" errors', async () => {
      mockGetStatusAsync.mockResolvedValue(1);
      mockRegisterTaskAsync.mockRejectedValue(
        new Error('Background Fetch has not been configured'),
      );

      await registerBackgroundTasks();

      // Should not call handleError for configuration errors
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('should silently ignore UIBackgroundModes errors', async () => {
      mockGetStatusAsync.mockResolvedValue(1);
      mockRegisterTaskAsync.mockRejectedValue(
        new Error('UIBackgroundModes not configured in Info.plist'),
      );

      await registerBackgroundTasks();

      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('should log other errors with warning severity', async () => {
      mockGetStatusAsync.mockResolvedValue(1);
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
    test('should treat background tasks as optional feature', async () => {
      // Multiple scenarios where background tasks fail gracefully
      mockGetStatusAsync.mockResolvedValue(2); // Unavailable
      await registerBackgroundTasks();
      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();

      mockGetStatusAsync.mockRejectedValue(new Error('Not supported'));
      const available = await isBackgroundTaskAvailable();
      expect(available).toBeFalsy();
    });

    test('should never throw errors to caller', async () => {
      mockGetStatusAsync.mockRejectedValue(new Error('Test'));
      mockRegisterTaskAsync.mockRejectedValue(new Error('Test'));
      mockUnregisterTaskAsync.mockRejectedValue(new Error('Test'));

      // All should resolve without throwing
      await expect(registerBackgroundTasks()).resolves.not.toThrow();
      await expect(unregisterBackgroundTasks()).resolves.not.toThrow();
      await expect(isBackgroundTaskAvailable()).resolves.not.toThrow();
    });
  });
});
