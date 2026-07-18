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

import { Platform } from 'react-native';

import type * as NotificationsModule from 'expo-notifications';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { Colors } from '@/constants/colors';
import {
  NOTIFICATION_ROUTE_BY_TYPE,
  NOTIFICATION_TYPES,
  SMART_NOTIFICATIONS,
} from '@/constants/notifications';
import type { AnyNotificationType } from '@/constants/notifications';
import { analytics } from '@/services/analytics';
import { handleError } from '@/utils/errorHandling';
import { buildReminderContent, dayOfYearSeed, reminderKindForPlan } from '@/utils/notificationCopy';
import type { PlannedNotification } from '@/utils/notificationPlanner';

// expo-notifications is unavailable in Expo Go on Android (SDK 53+).
// Use a guarded require so the module-level throw doesn't crash the app.
let Notifications: typeof NotificationsModule | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // Running in Expo Go on Android – notifications unavailable
}

// Configure notification behavior with Expo best practices
if (Notifications) {
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
}

let isInitialized = false;
let notificationSubscription: { remove: () => void } | null = null;
let responseSubscription: { remove: () => void } | null = null;
let droppedSubscription: { remove: () => void } | null = null;
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
  if (!Notifications) return false;
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
      // `sound` is deliberately omitted: on a channel it names a bundled sound
      // file, so a literal 'default' is looked up as a filename, fails, and
      // leaves the channel silent. Omitting it selects the system default.
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
        enableVibrate: true,
        showBadge: true,
      });

      // Also set up a default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.light.tint,
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
  if (!Notifications) return;
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

    if (actionIdentifier === 'DEFAULT' && typeof type === 'string') {
      const route = NOTIFICATION_ROUTE_BY_TYPE[type as AnyNotificationType];
      if (!route) return;

      if (
        type === NOTIFICATION_TYPES.SRS_DUE ||
        type === NOTIFICATION_TYPES.SRS_SLIPPING
      ) {
        analytics.track(ANALYTICS_EVENTS.SMART_REMINDER_OPENED, { type });
      }
      if (navigationCallback) {
        navigationCallback(route);
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

/**
 * A scheduled notification is ours when its identifier carries the smart
 * prefix, or when it is a legacy static daily reminder (identified by its
 * data.type, since pre-upgrade identifiers were `reminder-<timestamp>`).
 */
function isManagedNotification(request: NotificationsModule.NotificationRequest): boolean {
  if (request.identifier.startsWith(SMART_NOTIFICATIONS.IDENTIFIER_PREFIX)) return true;
  return request.content.data?.['type'] === NOTIFICATION_TYPES.DAILY_REMINDER;
}

async function cancelManagedNotifications(
  notifications: NonNullable<typeof Notifications>,
): Promise<void> {
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (isManagedNotification(request)) {
      await notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}

/** Cancel all smart-scheduled (and legacy daily) reminders. Never throws. */
export async function cancelSmartNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelManagedNotifications(Notifications);
  } catch (error) {
    handleError(error as Error, { showToast: false });
  }
}

/**
 * Replace the scheduled smart reminders with a freshly computed plan.
 * Idempotent: cancels every managed notification, then schedules the plan.
 * Check-only on permissions — never triggers the OS permission dialog.
 * Returns the number of notifications scheduled.
 */
export async function syncSmartNotifications(
  plan: PlannedNotification[],
  trigger?: string,
): Promise<number> {
  if (!Notifications) return 0;
  try {
    await initializeNotifications();
    await cancelManagedNotifications(Notifications);

    if (plan.length === 0) return 0;

    const status = await getPermissionStatus();
    if (status !== 'granted') return 0;

    let scheduledCount = 0;
    for (const planned of plan) {
      try {
        const kind = reminderKindForPlan(
          planned.type,
          planned.wordCount,
          planned.sampleWord !== undefined,
        );
        const { title, body } = buildReminderContent(
          kind,
          { count: planned.wordCount, word: planned.sampleWord?.arabic },
          dayOfYearSeed(planned.fireDate),
        );

        await Notifications.scheduleNotificationAsync({
          identifier: planned.identifier,
          content: {
            title,
            body,
            sound: true,
            badge: planned.badgeCount,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: 'reminder',
            data: {
              type: planned.type,
              wordCount: planned.wordCount,
              sampleRootId: planned.sampleWord?.rootId,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: planned.fireDate,
            channelId: Platform.OS === 'android' ? 'reminders' : undefined,
          },
        });
        scheduledCount++;
      } catch (error) {
        handleError(error as Error, {
          showToast: false,
          analyticsEventName: ANALYTICS_EVENTS.REMINDER_SCHEDULING_ERROR,
        });
      }
    }

    analytics.track(ANALYTICS_EVENTS.SMART_REMINDERS_SYNCED, {
      scheduledCount,
      planned: plan.length,
      horizonDays: SMART_NOTIFICATIONS.HORIZON_DAYS,
      trigger,
    });
    return scheduledCount;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: ANALYTICS_EVENTS.REMINDER_SCHEDULING_ERROR,
    });
    return 0;
  }
}

/**
 * Dismiss already-delivered smart reminders from the notification tray —
 * called when the app comes to the foreground so stale counts never linger.
 */
export async function dismissDeliveredSmartNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      if (isManagedNotification(notification.request)) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  } catch (error) {
    handleError(error as Error, { showToast: false });
  }
}

// Optimized badge management functions using Expo best practices
export async function setAppBadgeCount(count: number): Promise<boolean> {
  if (!Notifications) return false;
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
  if (!Notifications) return false;
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

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/**
 * Check-only permission status — never triggers the OS dialog.
 * 'unavailable' means the notifications module itself is absent (Expo Go Android).
 * Android has no 'undetermined': a never-asked app reports denied with
 * canAskAgain true, so that combination maps to 'undetermined' (askable);
 * only denied + !canAskAgain is a real, final denial.
 */
export async function getPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!Notifications) return 'unavailable';
  try {
    const { status, ios, canAskAgain } = await Notifications.getPermissionsAsync();

    if (Platform.OS === 'ios' && ios) {
      switch (ios.status) {
        case Notifications.IosAuthorizationStatus.AUTHORIZED:
        case Notifications.IosAuthorizationStatus.PROVISIONAL:
          return 'granted';
        case Notifications.IosAuthorizationStatus.DENIED:
        case Notifications.IosAuthorizationStatus.EPHEMERAL:
          return 'denied';
        case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
          return 'undetermined';
      }
    }

    if (status === 'granted') return 'granted';
    if (status === 'denied') return canAskAgain ? 'undetermined' : 'denied';
    return 'undetermined';
  } catch (error) {
    handleError(error as Error, { showToast: false });
    return 'unavailable';
  }
}

export async function ensurePermissions(): Promise<boolean> {
  if (!Notifications) return false;
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
  if (!Notifications) return false;
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
