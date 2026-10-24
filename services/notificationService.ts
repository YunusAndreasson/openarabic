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
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { buildReminderContent, dayOfYearSeed, reminderKindForPlan } from '@/utils/notificationCopy';
import { buildNotificationPlan, type PlannedNotification } from '@/utils/notificationPlanner';
import type { SmartReminderMirror } from '@/utils/smartReminderPrefs';

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
      shouldPlaySound: true,
      // Foreground-only presentation. A reminder's `badge:` payload is a count
      // PROJECTED when it was scheduled, so applying it over an open app would
      // overwrite the live count `useAppBadge` just wrote — and nothing would
      // correct it, since there is no background->active transition to trigger
      // a re-assert. While the app is open the hook owns the badge.
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
    // Optimize for battery and performance
    handleSuccess: (_notificationId: string) => {
      // Notification scheduled successfully - minimal logging for performance
    },
    handleError: (notificationId: string, error: Error) => {
      // Handle scheduling errors gracefully
      void handleError(error, {
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
let droppedSubscription: { remove: () => void } | null = null;

/** The delivered notification that last navigated — see handleNotificationResponse. */
let lastRoutedNotificationKey: string | null = null;

/**
 * Open the screen a tapped notification points at.
 *
 * Only a tap on the notification body routes, and expo-notifications reports
 * that tap as `DEFAULT_ACTION_IDENTIFIER` on both platforms. The live listener
 * used to compare against a bare 'DEFAULT', which never matched — so tapping a
 * reminder while the app was suspended resumed whatever screen was last open.
 * A press on an action button (the reminder's "Complete") acknowledges the
 * reminder and never routes, on a cold start included.
 *
 * The live listener and the cold-start read in `observeNotificationResponses`
 * both come through here. A launch tap can reach both, so a delivered
 * notification that already navigated is ignored: it is routed, and counted as
 * opened, once. Keyed on identifier + delivery date, because a repeating
 * reminder reuses its identifier every day.
 *
 * @returns whether it navigated
 */
export function handleNotificationResponse(
  response: NotificationsModule.NotificationResponse,
  navigate: ((path: string) => void) | null,
  { coldStart = false }: { coldStart?: boolean } = {},
): boolean {
  if (!Notifications || !navigate) return false;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return false;

  const { notification } = response;
  const { type } = notification.request.content.data ?? {};
  if (typeof type !== 'string' || !Object.hasOwn(NOTIFICATION_ROUTE_BY_TYPE, type)) {
    return false;
  }

  const notificationKey = `${notification.request.identifier}:${notification.date}`;
  if (notificationKey === lastRoutedNotificationKey) return false;
  lastRoutedNotificationKey = notificationKey;

  if (type === NOTIFICATION_TYPES.SRS_DUE || type === NOTIFICATION_TYPES.SRS_SLIPPING) {
    void analytics.track(
      ANALYTICS_EVENTS.SMART_REMINDER_OPENED,
      coldStart ? { type, coldStart } : { type },
    );
  }
  navigate(NOTIFICATION_ROUTE_BY_TYPE[type as AnyNotificationType]);
  return true;
}

/**
 * Route notification taps to `navigate`: the tap that launched the app, then
 * every tap after it. Returns the unsubscribe; a no-op where the notifications
 * module is absent (Expo Go on Android).
 *
 * This is Expo's documented observer pattern — the last response for a cold
 * start plus a response listener, in one subscription — instead of a
 * module-level navigation callback the root layout had to set and clear in
 * separate effects.
 */
export function observeNotificationResponses(navigate: (path: string) => void): () => void {
  if (!Notifications) return () => undefined;

  try {
    const launchResponse = Notifications.getLastNotificationResponse();
    if (launchResponse) {
      handleNotificationResponse(launchResponse, navigate, { coldStart: true });
      // Cleared so the next launch does not route the same tap again.
      Notifications.clearLastNotificationResponse();
    }
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Cold_Start_Notification_Error',
    });
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    handleNotificationResponse(response, navigate);
  });
  return () => {
    subscription.remove();
  };
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
    void handleError(error, { showToast: false });
    return false;
  }
}

// Set up notification listeners (Expo best practice). Taps are routed by
// observeNotificationResponses, which the root layout subscribes once it can
// navigate.
function setupNotificationListeners(): void {
  if (!Notifications) return;
  // Clean up the existing subscription before creating a new one
  droppedSubscription?.remove();

  // Listen for dropped notifications (Android FCM only)
  // This occurs when the notification queue overflows
  droppedSubscription = Notifications.addNotificationsDroppedListener(() => {
    // One report, which is also the one analytics event (handleError tracks
    // it under analyticsEventName); it used to be tracked a second time.
    void handleError(new Error('Notifications were dropped due to queue overflow'), {
      showToast: false,
      analyticsEventName: ANALYTICS_EVENTS.NOTIFICATIONS_DROPPED,
      analyticsProperties: { platform: Platform.OS },
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
  droppedSubscription?.remove();
  droppedSubscription = null;
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
    void handleError(error, { showToast: false });
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
        void handleError(error, {
          showToast: false,
          analyticsEventName: ANALYTICS_EVENTS.REMINDER_SCHEDULING_ERROR,
        });
      }
    }

    void analytics.track(ANALYTICS_EVENTS.SMART_REMINDERS_SYNCED, {
      scheduledCount,
      planned: plan.length,
      horizonDays: SMART_NOTIFICATIONS.HORIZON_DAYS,
      trigger,
    });
    return scheduledCount;
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: ANALYTICS_EVENTS.REMINDER_SCHEDULING_ERROR,
    });
    return 0;
  }
}

/**
 * Build the smart-reminder plan from the word set and the reminder setting,
 * and schedule it. The one path both schedulers take — the foreground hook and
 * the headless background task — so they cannot drift on what the plan is
 * built from. Never throws (see syncSmartNotifications).
 */
export async function syncReminderPlan(
  words: StudyWord[],
  prefs: SmartReminderMirror,
  trigger: string,
): Promise<number> {
  const plan = buildNotificationPlan({
    words,
    now: new Date(),
    preferredHour: prefs.hour,
    preferredMinute: prefs.minute,
    lastSessionCompletedAt: prefs.lastSessionCompletedAt,
  });
  return syncSmartNotifications(plan, trigger);
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
    void handleError(error, { showToast: false });
  }
}

/**
 * Reported once per app session. A rejected badge write is not an error and not
 * rare — it is the normal state of every install that has never granted
 * notifications — so one event per session is the signal, and a per-write event
 * would be pure noise.
 */
let badgeRejectionReported = false;

/**
 * Write the app icon badge. Returns whether the OS actually took the number.
 *
 * THE WRITE IS PERMISSION-GATED. iOS grants the badge as part of notification
 * authorization, so on an install that has never granted notifications — or has
 * since revoked them — `setBadgeCountAsync` takes the call, changes nothing and
 * returns false. It does not throw, and the icon keeps whatever number was last
 * written back when the app *was* authorized: measured 2026-08-30 on a real
 * device, an icon reading 9 while every count in the app said 11, unmovable by
 * reviewing, and corrected the instant the learner enabled reminders (which is
 * what runs `ensurePermissions`). Every caller had discarded the boolean, so
 * nothing anywhere could tell a written badge from a rejected one.
 *
 * Callers that need the badge to be RIGHT must therefore re-assert it rather
 * than write once and assume — see `useAppBadge`.
 */
export async function setAppBadgeCount(count: number): Promise<boolean> {
  if (!Notifications) return false;
  try {
    // Validate input
    const validCount = Math.max(0, Math.floor(count));

    // Expo already reports false by itself when badge permission is missing,
    // so pass its answer through rather than claiming success.
    const applied = await Notifications.setBadgeCountAsync(validCount);

    if (!applied && !badgeRejectionReported) {
      badgeRejectionReported = true;
      void analytics.track(ANALYTICS_EVENTS.BADGE_WRITE_REJECTED, { count: validCount });
    }

    return applied;
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Badge_Set_Error',
    });
    return false;
  }
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/**
 * One reading of a permission response, for the check and the request alike —
 * the same mapping used to be written out twice, and had drifted into a
 * `default` branch no response could reach.
 *
 * iOS answers in `ios.status`: PROVISIONAL counts as granted (quiet delivery
 * is enough for a reminder), EPHEMERAL (App Clips) as denied. Android has no
 * 'undetermined': a never-asked app reports denied with canAskAgain true, so
 * that combination maps to 'undetermined' (askable); only denied +
 * !canAskAgain is a real, final denial.
 */
function toPermissionStatus(
  notifications: NonNullable<typeof Notifications>,
  { status, ios, canAskAgain }: NotificationsModule.NotificationPermissionsStatus,
): Exclude<NotificationPermissionStatus, 'unavailable'> {
  if (Platform.OS === 'ios' && ios) {
    switch (ios.status) {
      case notifications.IosAuthorizationStatus.AUTHORIZED:
      case notifications.IosAuthorizationStatus.PROVISIONAL:
        return 'granted';
      case notifications.IosAuthorizationStatus.DENIED:
      case notifications.IosAuthorizationStatus.EPHEMERAL:
        return 'denied';
      case notifications.IosAuthorizationStatus.NOT_DETERMINED:
        return 'undetermined';
    }
  }

  if (status === 'granted') return 'granted';
  if (status === 'denied') return canAskAgain ? 'undetermined' : 'denied';
  return 'undetermined';
}

/**
 * Check-only permission status — never triggers the OS dialog.
 * 'unavailable' means the notifications module itself is absent (Expo Go Android).
 */
export async function getPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!Notifications) return 'unavailable';
  try {
    return toPermissionStatus(Notifications, await Notifications.getPermissionsAsync());
  } catch (error) {
    void handleError(error, { showToast: false });
    return 'unavailable';
  }
}

/**
 * Whether reminders may be delivered, asking the OS only when the answer is
 * still open. A granted or final answer is returned as it stands (Expo best
 * practice: check before requesting); an undetermined one shows the dialog.
 */
export async function ensurePermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const current = toPermissionStatus(Notifications, await Notifications.getPermissionsAsync());
    if (current !== 'undetermined') return current === 'granted';

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // Use minimal interruption for better UX
        allowCriticalAlerts: false,
        allowProvisional: false,
      },
      // No android options: the native side ignores them (POST_NOTIFICATIONS
      // is a single yes/no permission), so the key is omitted entirely.
    });

    return toPermissionStatus(Notifications, requested) === 'granted';
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Notification_Permission_Error',
    });
    return false;
  }
}
