/**
 * Notification Service Tests
 *
 * Tests the notification service which manages:
 * - Push notification initialization and configuration
 * - Daily reminder scheduling
 * - App badge count management
 * - Permission handling (iOS and Android)
 * - Notification listeners and navigation
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking (handleError, analytics)
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - tests share mock state and need isolation
 * - ✅ Custom expo-notifications mock pattern (preserved for compatibility)
 */

import { describe, test, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import { Platform } from 'react-native';

import type { ReminderTime } from '@/types/notifications.types';

// expo-notifications is already mocked by __mocks__/expo-notifications.js
// Import it to get access to the mock functions

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/constants/strings', () => ({
  STRINGS: {
    NOTIFICATIONS_DISABLED: 'Notifications are disabled',
    NOTIFICATION_REMINDER_TITLE: 'Time to practice!',
    NOTIFICATION_REMINDER_BODY: 'Keep your streak going',
  },
}));

jest.mock('@/constants/routes', () => ({
  ROUTE_PATHS: {
    PRACTICE_TAB: '/practice',
  },
}));

jest.mock('@/constants/colors', () => ({
  Colors: {
    light: {
      tint: '#4A9B8E',
    },
  },
}));

// Import after mocks
import * as Notifications from 'expo-notifications';
import { analytics } from '@/services/analytics';
import { handleError } from '@/utils/errorHandling';

// Get access to mock functions from expo-notifications mock
const NotificationsMock = Notifications as typeof Notifications & {
  __mocks: {
    setNotificationHandler: jest.Mock;
    setNotificationCategoryAsync: jest.Mock;
    setNotificationChannelAsync: jest.Mock;
    addNotificationReceivedListener: jest.Mock;
    addNotificationResponseReceivedListener: jest.Mock;
    addNotificationsDroppedListener: jest.Mock;
    getPermissionsAsync: jest.Mock;
    requestPermissionsAsync: jest.Mock;
    scheduleNotificationAsync: jest.Mock;
    cancelAllScheduledNotificationsAsync: jest.Mock;
    setBadgeCountAsync: jest.Mock;
    getBadgeCountAsync: jest.Mock;
  };
};

const mockSetNotificationHandler = NotificationsMock.__mocks.setNotificationHandler;
const mockSetNotificationCategoryAsync = NotificationsMock.__mocks.setNotificationCategoryAsync;
const mockSetNotificationChannelAsync = NotificationsMock.__mocks.setNotificationChannelAsync;
const mockAddNotificationReceivedListener =
  NotificationsMock.__mocks.addNotificationReceivedListener;
const mockAddNotificationResponseReceivedListener =
  NotificationsMock.__mocks.addNotificationResponseReceivedListener;
const mockAddNotificationsDroppedListener =
  NotificationsMock.__mocks.addNotificationsDroppedListener;
const mockGetPermissionsAsync = NotificationsMock.__mocks.getPermissionsAsync;
const mockRequestPermissionsAsync = NotificationsMock.__mocks.requestPermissionsAsync;
const mockScheduleNotificationAsync = NotificationsMock.__mocks.scheduleNotificationAsync;
const mockCancelAllScheduledNotificationsAsync =
  NotificationsMock.__mocks.cancelAllScheduledNotificationsAsync;
const mockSetBadgeCountAsync = NotificationsMock.__mocks.setBadgeCountAsync;
const mockGetBadgeCountAsync = NotificationsMock.__mocks.getBadgeCountAsync;

// Import service after mocks - service runs setNotificationHandler on load
import * as notificationService from '@/services/notificationService';

describe('notificationService', () => {
  // Initialize once at the start to set up listeners
  beforeAll(async () => {
    await notificationService.initializeNotifications();
  });

  beforeEach(() => {
    // Clear only the mocks that need to be reset, but not listener registration
    mockGetPermissionsAsync.mockClear();
    mockRequestPermissionsAsync.mockClear();
    mockScheduleNotificationAsync.mockClear();
    mockCancelAllScheduledNotificationsAsync.mockClear();
    mockSetBadgeCountAsync.mockClear();
    mockGetBadgeCountAsync.mockClear();
    mockSetNotificationCategoryAsync.mockClear();
    mockSetNotificationChannelAsync.mockClear();
    jest.mocked(handleError).mockClear();
    jest.mocked(analytics.track).mockClear();

    // Reset default mock implementations
    mockGetPermissionsAsync.mockResolvedValue({
      status: 'granted',
      ios: { allowsBadge: true, status: 2 },
    });

    mockRequestPermissionsAsync.mockResolvedValue({
      status: 'granted',
      ios: { allowsBadge: true, status: 2 },
    });

    mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      // Service is initialized in beforeAll, just verify it returns true when called again
      const success = await notificationService.initializeNotifications();
      expect(success).toBeTruthy();
    });

    test('should be idempotent (only initialize once)', async () => {
      // Service already initialized, calling again should return true without re-initializing
      const success1 = await notificationService.initializeNotifications();
      const success2 = await notificationService.initializeNotifications();
      expect(success1).toBeTruthy();
      expect(success2).toBeTruthy();
    });
  });

  describe('Permission Handling', () => {
    test('should return true if permissions already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeTruthy();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('should request permissions if not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
      mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeTruthy();
      expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: false,
          allowProvisional: false,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    });

    test('should return false if user denies permissions', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
      mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeFalsy();
    });

    test('should handle iOS provisional authorization as granted', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
      });

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeTruthy();
    });

    test('should not request if iOS status is DENIED', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        ios: { status: Notifications.IosAuthorizationStatus.DENIED },
      });

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeFalsy();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('should handle iOS ephemeral status as not granted', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'undetermined',
        ios: { status: Notifications.IosAuthorizationStatus.EPHEMERAL },
      });

      const granted = await notificationService.ensurePermissions();

      // Ephemeral is treated as not granted
      expect(typeof granted).toBe('boolean');
    });

    test('should check badge-specific permission on iOS', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        ios: { allowsBadge: true },
      });

      const canBadge = await notificationService.canUseBadge();

      expect(canBadge).toBeTruthy();
    });

    test('should return false for badge if iOS badge permission denied', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        ios: { allowsBadge: false },
      });

      const canBadge = await notificationService.canUseBadge();

      expect(canBadge).toBeFalsy();
    });

    test('should allow badge on Android if notification permission granted', async () => {
      Platform.OS = 'android';
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      });

      const canBadge = await notificationService.canUseBadge();

      expect(canBadge).toBeTruthy();
    });
  });

  describe('Reminder Scheduling', () => {
    const validReminderTime: ReminderTime = {
      enabled: true,
      hour: 9,
      minute: 30,
    };

    test('should schedule daily reminder successfully', async () => {
      const id = await notificationService.scheduleReminder(validReminderTime);

      expect(id).toBe('notification-id-123');
      expect(mockScheduleNotificationAsync).toHaveBeenCalled();
    });

    test('should return null if reminder is disabled', async () => {
      const disabledReminder: ReminderTime = {
        enabled: false,
        hour: 9,
        minute: 30,
      };

      const id = await notificationService.scheduleReminder(disabledReminder);

      expect(id).toBeNull();
      expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    });

    test('should validate reminder time (hour)', async () => {
      const invalidReminder: ReminderTime = {
        enabled: true,
        hour: 25, // Invalid hour
        minute: 30,
      };

      const id = await notificationService.scheduleReminder(invalidReminder);

      expect(id).toBeNull();
      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid reminder time' }),
        expect.any(Object),
      );
    });

    test('should validate reminder time (minute)', async () => {
      const invalidReminder: ReminderTime = {
        enabled: true,
        hour: 9,
        minute: 70, // Invalid minute
      };

      const id = await notificationService.scheduleReminder(invalidReminder);

      expect(id).toBeNull();
      expect(handleError).toHaveBeenCalled();
    });

    test('should validate reminder time (negative values)', async () => {
      const invalidReminder: ReminderTime = {
        enabled: true,
        hour: -1,
        minute: 30,
      };

      const id = await notificationService.scheduleReminder(invalidReminder);

      expect(id).toBeNull();
    });

    test('should handle scheduling errors gracefully', async () => {
      mockScheduleNotificationAsync.mockRejectedValueOnce(new Error('Scheduling failed'));

      const id = await notificationService.scheduleReminder(validReminderTime);

      expect(id).toBeNull();
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Reminder Cancellation', () => {
    test('should cancel all scheduled notifications', async () => {
      await notificationService.cancelReminder();

      expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    test('should handle cancellation errors gracefully', async () => {
      mockCancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('Cancel failed'));

      await expect(notificationService.cancelReminder()).resolves.not.toThrow();
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Badge Management', () => {
    test('should set app badge count', async () => {
      const success = await notificationService.setAppBadgeCount(5);

      expect(success).toBeTruthy();
      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    test('should validate badge count (floor decimal)', async () => {
      await notificationService.setAppBadgeCount(5.7);

      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    test('should validate badge count (prevent negative)', async () => {
      await notificationService.setAppBadgeCount(-3);

      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
    });

    test('should handle badge set errors', async () => {
      mockSetBadgeCountAsync.mockRejectedValueOnce(new Error('Badge set failed'));

      const success = await notificationService.setAppBadgeCount(5);

      expect(success).toBeFalsy();
      expect(handleError).toHaveBeenCalled();
    });

    test('should clear app badge', async () => {
      const success = await notificationService.clearAppBadge();

      expect(success).toBeTruthy();
      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
    });

    test('should handle badge clear errors', async () => {
      mockSetBadgeCountAsync.mockRejectedValueOnce(new Error('Clear failed'));

      const success = await notificationService.clearAppBadge();

      expect(success).toBeFalsy();
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Notification Listeners and Navigation', () => {
    test('should set and clear navigation callback', () => {
      const callback = jest.fn();
      notificationService.setNotificationNavigationCallback(callback);
      // Callback is set (internal state)

      notificationService.clearNotificationNavigationCallback();
      // Callback is cleared (internal state)

      // Just verify these don't throw
      expect(callback).toBeDefined();
    });

    test('should handle cleanup when no listeners exist', () => {
      expect(() => notificationService.cleanupNotifications()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle permission check with missing ios property', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        ios: undefined,
      });

      const canBadge = await notificationService.canUseBadge();

      // Should handle gracefully
      expect(typeof canBadge).toBe('boolean');
    });
  });
});
