import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/Colors';
import { STRINGS } from '@/constants/strings';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let isInitialized = false;

async function initialize(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      handleError(new Error('Notification permissions not granted'), {
        showToast: false,
        captureSentry: false,
      });
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        sound: 'default',
        enableVibrate: true,
      });
    }

    isInitialized = true;
    return true;
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return false;
  }
}

export async function scheduleReminder(reminderTime: ReminderTime): Promise<string | null> {
  const initialized = await initialize();
  if (!initialized) {
    handleError(new Error('Notifications disabled'), {
      toastMessage: STRINGS.NOTIFICATIONS_DISABLED,
      captureSentry: false,
    });
    return null;
  }

  try {
    // Cancel existing reminder first
    await cancelReminder();

    if (!reminderTime.enabled) {
      return null;
    }

    // Simple, reliable notification content
    const title = STRINGS.NOTIFICATION_REMINDER_TITLE;
    const body = STRINGS.NOTIFICATION_REMINDER_BODY;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'reminder',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: reminderTime.hour,
        minute: reminderTime.minute,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'reminders' : undefined,
      },
    });

    return identifier;
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return null;
  }
}

export async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    handleError(error as Error, { showToast: false });
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return false;
  }
}

/**
 * Updates the app icon badge count on the phone's home screen
 * @param count - Number to display on the badge (0 removes the badge)
 */
export async function updateAppIconBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      captureSentry: false,
      analyticsEventName: 'App_Icon_Badge_Update_Error',
    });
  }
}
