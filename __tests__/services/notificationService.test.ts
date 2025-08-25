import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/Colors';
import { STRINGS } from '@/constants/strings';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

import {
  cancelReminder,
  canUseBadge,
  clearAppBadge,
  cleanupNotifications,
  ensurePermissions,
  getAppBadgeCount,
  hasPermissions,
  initializeNotifications,
  scheduleReminder,
  setAppBadgeCount,
} from '../../services/notificationService';

jest.mock('expo-notifications');
jest.mock('@/utils/errorHandling');

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  describe('initializeNotifications', () => {
    it('sets up notification categories and channels', async () => {
      mockNotifications.setNotificationCategoryAsync.mockResolvedValue();
      mockNotifications.setNotificationChannelAsync.mockResolvedValue();

      const result = await initializeNotifications();

      expect(result).toBe(true);
      expect(mockNotifications.setNotificationCategoryAsync).toHaveBeenCalledWith('reminder', [
        {
          identifier: 'complete',
          buttonTitle: 'Complete',
          options: {
            isAuthenticationRequired: false,
            isDestructive: false,
          },
        },
      ]);
    });

    it('sets up Android notification channels', async () => {
      Platform.OS = 'android';
      mockNotifications.setNotificationCategoryAsync.mockResolvedValue();
      mockNotifications.setNotificationChannelAsync.mockResolvedValue();

      const result = await initializeNotifications();

      expect(result).toBe(true);
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    });

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Initialization failed');
      mockNotifications.setNotificationCategoryAsync.mockRejectedValue(error);

      const result = await initializeNotifications();

      expect(result).toBe(false);
      expect(mockHandleError).toHaveBeenCalledWith(error, { showToast: false });
    });

    it('returns true if already initialized', async () => {
      mockNotifications.setNotificationCategoryAsync.mockResolvedValue();
      mockNotifications.setNotificationChannelAsync.mockResolvedValue();

      await initializeNotifications();
      const result = await initializeNotifications();

      expect(result).toBe(true);
      expect(mockNotifications.setNotificationCategoryAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleReminder', () => {
    const validReminderTime: ReminderTime = {
      hour: 9,
      minute: 30,
      enabled: true,
    };

    beforeEach(() => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        ios: { allowsAlert: true, allowsBadge: true, allowsSound: true },
      } as any);
      mockNotifications.setNotificationCategoryAsync.mockResolvedValue();
      mockNotifications.setNotificationChannelAsync.mockResolvedValue();
      mockNotifications.cancelAllScheduledNotificationsAsync.mockResolvedValue();
    });

    it('schedules a valid reminder', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('reminder-123');

      const result = await scheduleReminder(validReminderTime);

      expect(result).toBe('reminder-123');
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: expect.stringMatching(/^reminder-\d+$/),
        content: {
          title: STRINGS.NOTIFICATION_REMINDER_TITLE,
          body: STRINGS.NOTIFICATION_REMINDER_BODY,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'reminder',
          data: {
            type: 'study-reminder',
            scheduledTime: '9:30',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 9,
          minute: 30,
          repeats: true,
          channelId: undefined,
        },
      });
    });

    it('includes Android channel ID when on Android', async () => {
      Platform.OS = 'android';
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('reminder-123');

      await scheduleReminder(validReminderTime);

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            channelId: 'reminders',
          }),
        })
      );
    });

    it('returns null when reminder is disabled', async () => {
      const disabledReminder: ReminderTime = {
        hour: 9,
        minute: 30,
        enabled: false,
      };

      const result = await scheduleReminder(disabledReminder);

      expect(result).toBeNull();
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('validates reminder time and rejects invalid hours', async () => {
      const invalidReminder: ReminderTime = {
        hour: 25,
        minute: 30,
        enabled: true,
      };

      const result = await scheduleReminder(invalidReminder);

      expect(result).toBeNull();
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid reminder time' }),
        expect.objectContaining({
          analyticsEventName: 'Reminder_Scheduling_Error',
        })
      );
    });

    it('validates reminder time and rejects invalid minutes', async () => {
      const invalidReminder: ReminderTime = {
        hour: 9,
        minute: 60,
        enabled: true,
      };

      const result = await scheduleReminder(invalidReminder);

      expect(result).toBeNull();
    });

    it('handles scheduling errors gracefully', async () => {
      const error = new Error('Scheduling failed');
      mockNotifications.scheduleNotificationAsync.mockRejectedValue(error);

      const result = await scheduleReminder(validReminderTime);

      expect(result).toBeNull();
      expect(mockHandleError).toHaveBeenCalledWith(error, {
        showToast: false,
        analyticsEventName: 'Reminder_Scheduling_Error',
      });
    });
  });

  describe('cancelReminder', () => {
    it('cancels all scheduled notifications', async () => {
      mockNotifications.cancelAllScheduledNotificationsAsync.mockResolvedValue();

      await cancelReminder();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it('handles cancellation errors gracefully', async () => {
      const error = new Error('Cancellation failed');
      mockNotifications.cancelAllScheduledNotificationsAsync.mockRejectedValue(error);

      await cancelReminder();

      expect(mockHandleError).toHaveBeenCalledWith(error, { showToast: false });
    });
  });

  describe('badge management', () => {
    describe('setAppBadgeCount', () => {
      it('sets badge count to valid positive number', async () => {
        mockNotifications.setBadgeCountAsync.mockResolvedValue();

        const result = await setAppBadgeCount(5);

        expect(result).toBe(true);
        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
      });

      it('normalizes negative numbers to zero', async () => {
        mockNotifications.setBadgeCountAsync.mockResolvedValue();

        const result = await setAppBadgeCount(-5);

        expect(result).toBe(true);
        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      });

      it('floors decimal numbers', async () => {
        mockNotifications.setBadgeCountAsync.mockResolvedValue();

        const result = await setAppBadgeCount(5.7);

        expect(result).toBe(true);
        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
      });

      it('handles errors gracefully', async () => {
        const error = new Error('Badge set failed');
        mockNotifications.setBadgeCountAsync.mockRejectedValue(error);

        const result = await setAppBadgeCount(5);

        expect(result).toBe(false);
        expect(mockHandleError).toHaveBeenCalledWith(error, {
          showToast: false,
          analyticsEventName: 'Badge_Set_Error',
        });
      });
    });

    describe('clearAppBadge', () => {
      it('clears badge by setting count to zero', async () => {
        mockNotifications.setBadgeCountAsync.mockResolvedValue();

        const result = await clearAppBadge();

        expect(result).toBe(true);
        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      });

      it('handles errors gracefully', async () => {
        const error = new Error('Badge clear failed');
        mockNotifications.setBadgeCountAsync.mockRejectedValue(error);

        const result = await clearAppBadge();

        expect(result).toBe(false);
        expect(mockHandleError).toHaveBeenCalledWith(error, {
          showToast: false,
          analyticsEventName: 'Badge_Clear_Error',
        });
      });
    });

    describe('getAppBadgeCount', () => {
      it('returns badge count from system', async () => {
        mockNotifications.getBadgeCountAsync.mockResolvedValue(3);

        const result = await getAppBadgeCount();

        expect(result).toBe(3);
      });

      it('normalizes negative badge count to zero', async () => {
        mockNotifications.getBadgeCountAsync.mockResolvedValue(-1);

        const result = await getAppBadgeCount();

        expect(result).toBe(0);
      });

      it('handles errors gracefully and returns zero', async () => {
        const error = new Error('Badge get failed');
        mockNotifications.getBadgeCountAsync.mockRejectedValue(error);

        const result = await getAppBadgeCount();

        expect(result).toBe(0);
        expect(mockHandleError).toHaveBeenCalledWith(error, {
          showToast: false,
          analyticsEventName: 'Badge_Get_Error',
        });
      });
    });
  });

  describe('permissions', () => {
    describe('hasPermissions', () => {
      it('returns true when permissions are granted', async () => {
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
        } as any);

        const result = await hasPermissions();

        expect(result).toBe(true);
      });

      it('returns false when permissions are not granted', async () => {
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'denied',
        } as any);

        const result = await hasPermissions();

        expect(result).toBe(false);
      });

      it('handles errors gracefully', async () => {
        const error = new Error('Permission check failed');
        mockNotifications.getPermissionsAsync.mockRejectedValue(error);

        const result = await hasPermissions();

        expect(result).toBe(false);
        expect(mockHandleError).toHaveBeenCalledWith(error, { showToast: false });
      });
    });

    describe('ensurePermissions', () => {
      it('returns true when permissions already granted', async () => {
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
        } as any);

        const result = await ensurePermissions();

        expect(result).toBe(true);
        expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
      });

      it('requests and returns true when permissions granted after request', async () => {
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'undetermined',
        } as any);
        mockNotifications.requestPermissionsAsync.mockResolvedValue({
          status: 'granted',
        } as any);

        const result = await ensurePermissions();

        expect(result).toBe(true);
        expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledWith({
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

      it('returns false when permissions denied after request', async () => {
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'undetermined',
        } as any);
        mockNotifications.requestPermissionsAsync.mockResolvedValue({
          status: 'denied',
        } as any);

        const result = await ensurePermissions();

        expect(result).toBe(false);
      });

      it('handles errors gracefully', async () => {
        const error = new Error('Permission request failed');
        mockNotifications.getPermissionsAsync.mockRejectedValue(error);

        const result = await ensurePermissions();

        expect(result).toBe(false);
        expect(mockHandleError).toHaveBeenCalledWith(error, {
          showToast: false,
          analyticsEventName: 'Notification_Permission_Error',
        });
      });
    });

    describe('canUseBadge', () => {
      it('returns true on Android when notification permission granted', async () => {
        Platform.OS = 'android';
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
        } as any);

        const result = await canUseBadge();

        expect(result).toBe(true);
      });

      it('returns false on Android when notification permission not granted', async () => {
        Platform.OS = 'android';
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'denied',
        } as any);

        const result = await canUseBadge();

        expect(result).toBe(false);
      });

      it('returns true on iOS when badge permission granted', async () => {
        Platform.OS = 'ios';
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
          ios: { allowsBadge: true },
        } as any);

        const result = await canUseBadge();

        expect(result).toBe(true);
      });

      it('returns false on iOS when badge permission not granted', async () => {
        Platform.OS = 'ios';
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
          ios: { allowsBadge: false },
        } as any);

        const result = await canUseBadge();

        expect(result).toBe(false);
      });

      it('handles missing iOS permissions object', async () => {
        Platform.OS = 'ios';
        mockNotifications.getPermissionsAsync.mockResolvedValue({
          status: 'granted',
          ios: undefined,
        } as any);

        const result = await canUseBadge();

        expect(result).toBe(false);
      });

      it('handles errors gracefully', async () => {
        const error = new Error('Badge permission check failed');
        mockNotifications.getPermissionsAsync.mockRejectedValue(error);

        const result = await canUseBadge();

        expect(result).toBe(false);
        expect(mockHandleError).toHaveBeenCalledWith(error, {
          showToast: false,
          analyticsEventName: 'Badge_Permission_Check_Error',
        });
      });
    });
  });

  describe('cleanupNotifications', () => {
    it('removes notification subscription when it exists', () => {
      const mockSubscription = {
        remove: jest.fn(),
      };
      mockNotifications.addNotificationReceivedListener.mockReturnValue(mockSubscription as any);

      initializeNotifications();
      cleanupNotifications();

      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it('handles cleanup when no subscription exists', () => {
      expect(() => cleanupNotifications()).not.toThrow();
    });
  });
});