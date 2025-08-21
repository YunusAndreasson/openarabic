import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/Colors';
import { STRINGS } from '@/constants/strings';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

// Configure notification behavior with Expo best practices
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
  handleSuccess: () => {
    // Notification scheduled successfully
  },
  handleError: () => {
    // Notification scheduling failed - error handled by service
  },
});

let isInitialized = false;
let notificationSubscription: Notifications.Subscription | null = null;

// Initialize notifications during app startup (Expo best practice)
export async function initializeNotifications(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    // Set up notification categories for interactive notifications
    await Notifications.setNotificationCategoryAsync('reminder', [
      {
        identifier: 'complete',
        buttonTitle: 'Complete',
        options: {
          isAuthenticationRequired: false,
          isDestructive: false,
        },
      },
    ]);

    // Configure notification channel for Android with proper defaults
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        sound: 'default',
        enableVibrate: true,
        showBadge: false,
      });

      // Also set up a default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        sound: 'default',
        enableVibrate: true,
        showBadge: false,
      });
    }

    // Set up notification listeners for app lifecycle events
    setupNotificationListeners();

    isInitialized = true;
    return true;
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return false;
  }
}

// Set up notification listeners (Expo best practice)
function setupNotificationListeners(): void {
  if (notificationSubscription) {
    notificationSubscription.remove();
  }

  // Listen for notification received events
  notificationSubscription = Notifications.addNotificationReceivedListener(() => {
    // Notification received - handle silently
  });

  // Listen for notification response events (when user interacts with notification)
  Notifications.addNotificationResponseReceivedListener(response => {
    const { actionIdentifier } = response;

    if (actionIdentifier === 'complete') {
      // Handle mark as complete action
      // User marked reminder as complete
    }
  });
}

// Cleanup notification listeners
export function cleanupNotifications(): void {
  if (notificationSubscription) {
    notificationSubscription.remove();
    notificationSubscription = null;
  }
}

async function initialize(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    // Use the new optimized initialization function
    const notificationsInitialized = await initializeNotifications();
    if (!notificationsInitialized) {
      return false;
    }

    // Request permissions (separate from initialization)
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

    return true;
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return false;
  }
}

export async function scheduleReminder(reminderTime: ReminderTime): Promise<string | null> {
  try {
    // Initialize notifications if not already done
    const initialized = await initialize();
    if (!initialized) {
      handleError(new Error('Notifications disabled'), {
        toastMessage: STRINGS.NOTIFICATIONS_DISABLED,
        captureSentry: false,
      });
      return null;
    }

    // Cancel existing reminder first
    await cancelReminder();

    if (!reminderTime.enabled) {
      return null;
    }

    // Validate reminder time
    if (
      reminderTime.hour < 0 ||
      reminderTime.hour > 23 ||
      reminderTime.minute < 0 ||
      reminderTime.minute > 59
    ) {
      throw new Error('Invalid reminder time');
    }

    // Enhanced notification content with better structure
    const title = STRINGS.NOTIFICATION_REMINDER_TITLE;
    const body = STRINGS.NOTIFICATION_REMINDER_BODY;

    // Use Expo's scheduling with enhanced trigger configuration
    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${Date.now()}`, // Unique identifier
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'reminder',
        data: {
          type: 'study-reminder',
          scheduledTime: `${reminderTime.hour}:${reminderTime.minute}`,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: reminderTime.hour,
        minute: reminderTime.minute,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'reminders' : undefined,
      },
    });

    // Reminder scheduled successfully
    return identifier;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Reminder_Scheduling_Error',
    });
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

export async function ensurePermissions(): Promise<boolean> {
  try {
    // First check current permissions (more efficient than always requesting)
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') {
      return true;
    }

    // Only request if not already granted (Expo best practice)
    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    // Handle different permission states properly
    if (request.status === 'granted') {
      return true;
    }

    if (request.status === 'denied') {
      // Notification permissions denied by user
      return false;
    }

    // Handle undetermined state (user dismissed dialog)
    // Notification permissions undetermined
    return false;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Notification_Permission_Error',
    });
    return false;
  }
}
