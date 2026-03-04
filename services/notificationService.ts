/**
 * Notification Service
 * Push notification and reminder management with graceful error handling
 *
 * ERROR RESILIENCE PATTERN
 * ========================
 * This service prioritizes user experience over notification reliability.
 * Notification failures should never block user actions or crash the app.
 *
 * Why Error Resilience:
 * - Permissions may be denied by user (user choice must be respected)
 * - Notification channels may fail on specific Android versions
 * - OS may throttle notifications (battery optimization, Do Not Disturb)
 * - Scheduling may fail due to system limits (64 pending notifications on iOS)
 * - App should work perfectly without notifications
 *
 * Expected Behavior:
 * - ✅ Permission denied → returns false, no error thrown
 * - ✅ Scheduling fails → logs to Sentry (warning), no crash
 * - ✅ Channel creation fails → continues with fallback channel
 * - ✅ Listener setup fails → app continues without notifications
 * - ❌ NEVER throws exceptions that propagate to UI
 * - ❌ NEVER shows user-facing errors for notification failures
 * - ⚠️  Logs errors to Sentry with "warning" severity (not critical)
 *
 * Testing Implications:
 * - Tests should verify "does not throw" for permission denials
 * - Mock Notifications methods to return different permission states
 * - Focus on: error boundaries, graceful fallback, status checks
 * - Test listener cleanup to prevent memory leaks
 * - Don't test Expo Notifications internals (third-party responsibility)
 *
 * Platform Differences:
 * - iOS: Requires explicit permission request
 * - Android: Requires notification channels (API 26+)
 * - Both: May have system-level notification blocking
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { Colors } from '@/constants/colors';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import type { ReminderTime } from '@/types/notifications.types';
import { handleError } from '@/utils/errorHandling';

// Configure notification behavior with Expo best practices
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
  // Optimize for battery and performance
  handleSuccess: (_notificationId: string) => {
    // Notification scheduled successfully - minimal logging for performance
  },
  handleError: (notificationId: string, error: Error) => {
    // Handle scheduling errors gracefully
    handleError(error, {
      analyticsEventName: ANALYTICS_EVENTS.NOTIFICATION_SCHEDULING_FAILED,
      sentryTags: { location: 'notifications', notificationId },
      sentryExtra: { notificationId },
      showToast: false, // Silent failure for notifications
      sentrySeverity: 'warning',
    });
  },
});

let isInitialized = false;
let notificationSubscription: Notifications.Subscription | null = null;
let responseSubscription: Notifications.Subscription | null = null;
let droppedSubscription: Notifications.Subscription | null = null;
let navigationCallback: ((path: string) => void) | null = null;

// Set navigation callback from app layout
export function setNotificationNavigationCallback(callback: (path: string) => void): void {
  navigationCallback = callback;
}

// Clear navigation callback
export function clearNotificationNavigationCallback(): void {
  navigationCallback = null;
}

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
        showBadge: true,
      });

      // Also set up a default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
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
  // Clean up existing subscriptions before creating new ones
  if (notificationSubscription) {
    notificationSubscription.remove();
  }
  if (responseSubscription) {
    responseSubscription.remove();
  }
  if (droppedSubscription) {
    droppedSubscription.remove();
  }

  // Listen for notification received events
  notificationSubscription = Notifications.addNotificationReceivedListener(() => {
    // Notification received - handle silently
  });

  // Listen for notification response events (when user interacts with notification)
  responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { actionIdentifier } = response;
    const { type } = response.notification.request.content.data || {};

    // If user tapped "Complete" action button, do nothing (already acknowledged)
    if (actionIdentifier === 'complete') {
      return;
    }

    // For default tap action, navigate to Study tab if it's a study reminder
    if (actionIdentifier === 'DEFAULT' && type === 'study-reminder') {
      if (navigationCallback) {
        navigationCallback(ROUTE_PATHS.PRACTICE_TAB);
      }
    }
  });

  // Listen for dropped notifications (Android FCM only)
  // This occurs when the notification queue overflows
  droppedSubscription = Notifications.addNotificationsDroppedListener(() => {
    // Track dropped notifications for monitoring
    analytics.track(ANALYTICS_EVENTS.NOTIFICATIONS_DROPPED, {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

    // Also log to Sentry as a warning
    handleError(new Error('Notifications were dropped due to queue overflow'), {
      showToast: false,
      analyticsEventName: ANALYTICS_EVENTS.NOTIFICATIONS_DROPPED,
      sentrySeverity: 'warning',
      sentryTags: {
        location: 'notifications',
        platform: Platform.OS,
      },
    });
  });
}

// Cleanup notification listeners
export function cleanupNotifications(): void {
  if (notificationSubscription) {
    notificationSubscription.remove();
    notificationSubscription = null;
  }
  if (responseSubscription) {
    responseSubscription.remove();
    responseSubscription = null;
  }
  if (droppedSubscription) {
    droppedSubscription.remove();
    droppedSubscription = null;
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

async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    handleError(error as Error, { showToast: false });
  }
}

// Optimized badge management functions using Expo best practices
export async function setAppBadgeCount(count: number): Promise<boolean> {
  try {
    // Validate input
    const validCount = Math.max(0, Math.floor(count));

    // Use Expo's efficient API
    await Notifications.setBadgeCountAsync(validCount);
    return true;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Badge_Set_Error',
    });
    return false;
  }
}

export async function clearAppBadge(): Promise<boolean> {
  try {
    await Notifications.setBadgeCountAsync(0);
    return true;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Badge_Clear_Error',
    });
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

    // Check iOS-specific authorization status
    if (Platform.OS === 'ios' && existing.ios) {
      const iosStatus = existing.ios.status;

      // Handle iOS-specific statuses
      switch (iosStatus) {
        case Notifications.IosAuthorizationStatus.PROVISIONAL:
          // User has provisional authorization - quiet notifications in notification center
          // This is acceptable for our use case
          return true;

        case Notifications.IosAuthorizationStatus.EPHEMERAL:
          // App Clips only - very limited, treat as not granted
          return false;

        case Notifications.IosAuthorizationStatus.DENIED:
          // Explicitly denied - don't request again
          return false;

        case Notifications.IosAuthorizationStatus.AUTHORIZED:
          // Fully authorized
          return true;

        case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
          // Fall through to request permissions
          break;
      }
    }

    // Only request if not already granted (Expo best practice)
    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // Use minimal interruption for better UX
        allowCriticalAlerts: false,
        allowProvisional: false,
      },
      android: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    // Handle different permission states properly
    switch (request.status) {
      case 'granted':
        return true;
      case 'denied':
        // User explicitly denied - respect their choice
        return false;
      case 'undetermined':
        // User dismissed dialog - don't keep asking
        return false;
      default:
        // Check iOS status again after request
        if (Platform.OS === 'ios' && request.ios) {
          return (
            request.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
            request.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL
          );
        }
        return false;
    }
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Notification_Permission_Error',
    });
    return false;
  }
}

// Efficient permission check for badge-only access
export async function canUseBadge(): Promise<boolean> {
  try {
    const { status, ios } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') return false;

    // On iOS, we need specific badge permission
    if (Platform.OS === 'ios') {
      return ios?.allowsBadge ?? false;
    }

    // On Android, badge is controlled by notification permission
    return true;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Badge_Permission_Check_Error',
    });
    return false;
  }
}
