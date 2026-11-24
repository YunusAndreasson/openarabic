import { widgetBridge } from '@/services/widgets/native';
import { teardownPending } from '@/services/accountTeardown';
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
import { createSerialQueue } from '@/utils/createSerialQueue';
import {
  REMINDER_CHANNEL,
  reminderRevision,
  verifiedReminderTimes,
  type ReminderAccess,
  type ReminderObservation,
} from '@/utils/reviewReminderPlan';
import { recordReminderObservation } from '@/services/reviewReminderJourney';

import type * as NotificationsModule from 'expo-notifications';
import type { Href } from 'expo-router';

import { ANALYTICS_EVENTS, SUPER_PROPERTIES } from '@/constants/analytics';
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
  Notifications = require('expo-notifications') as typeof NotificationsModule;
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
  navigate: ((href: Href) => void) | null,
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

  void analytics.track(ANALYTICS_EVENTS.NOTIFICATION_OPENED, { type, cold_start: coldStart });
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
export function observeNotificationResponses(navigate: (href: Href) => void): () => void {
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
  stale?: { owner: string; revision: string },
): Promise<void> {
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (
      isManagedNotification(request) &&
      (!stale ||
        (request.content.data?.['reminderOwner'] === stale.owner &&
          request.content.data['planRevision'] === stale.revision))
    ) {
      await notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}

const planQueue = createSerialQueue();
/** Drain foreground writes before removing scheduled and delivered requests.
 * Legacy daily requests predate owner tags and belong to the outgoing session. */
export async function cancelAccountNotifications(owner: string) {
  await widgetBridge?.closePublications();
  return planQueue(async () => {
    if (!Notifications) {
      if (Platform.OS === 'ios' || Platform.OS === 'android')
        throw new Error('Notification cleanup is unavailable');
      return;
    }
    const belongs = (request: NotificationsModule.NotificationRequest) => {
      const tagged = request.content.data?.['reminderOwner'];
      return isManagedNotification(request) && (tagged == null || tagged === owner);
    };
    for (const request of await Notifications.getAllScheduledNotificationsAsync()) {
      if (belongs(request))
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    for (const { request } of await Notifications.getPresentedNotificationsAsync()) {
      if (belongs(request)) await Notifications.dismissNotificationAsync(request.identifier);
    }
    await setAppBadgeCount(0);
  });
}
type Observer = (owner: string | undefined, result?: ReminderObservation) => void;
const observers = new Set<Observer>();
export function observeReminderPlan(observer: Observer) {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
}
async function publishReminder(owner?: string, result?: ReminderObservation) {
  observers.forEach(observer => observer(owner, result));
  await recordReminderObservation(owner, result).catch(() => undefined);
}

/** Cancel all smart-scheduled (and legacy daily) reminders. Never throws. */
export async function cancelSmartNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const notifications = Notifications;
    await planQueue(async () => {
      await publishReminder();
      await cancelManagedNotifications(notifications);
    });
  } catch (error) {
    void handleError(error, { showToast: false });
  }
}

/** The `trigger` the headless background task syncs with. */
export const BACKGROUND_SYNC_TRIGGER = 'background-task';

/**
 * The scheduled count last reported to analytics this launch. A sync runs on
 * every change to the word set, so only a changed count is news.
 */
let lastReportedScheduledCount: number | null = null;

/**
 * Replace the scheduled smart reminders with a freshly computed plan.
 * Idempotent: cancels every managed notification, then schedules the plan.
 * Check-only on permissions — never triggers the OS permission dialog.
 * Returns the number of notifications scheduled.
 */
export function syncSmartNotifications(plan: PlannedNotification[], trigger?: string) {
  return planQueue(() => replaceSmartNotifications(plan, trigger));
}

async function replaceSmartNotifications(
  plan: PlannedNotification[],
  trigger?: string,
  tags?: { reminderOwner: string; planRevision: string },
  acknowledged?: Set<string>,
  current?: () => Promise<boolean>,
): Promise<number> {
  if (!Notifications) return 0;
  try {
    await initializeNotifications();
    // A process can stop between removing yesterday’s plan and verifying the replacement.
    // Retire the old metric snapshot before the first destructive OS operation.
    if (tags) await recordReminderObservation(tags.reminderOwner).catch(() => undefined);
    if (current && !(await current())) return 0;
    await cancelManagedNotifications(Notifications);

    if (plan.length === 0) return 0;

    const status = await getPermissionStatus();
    if (status !== 'granted') return 0;

    let scheduledCount = 0;
    for (const planned of plan) {
      if (current && !(await current())) break;
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

        const identifier = await Notifications.scheduleNotificationAsync({
          identifier: planned.identifier,
          content: {
            title,
            body,
            sound: true,
            badge: planned.badgeCount,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: 'reminder',
            data: {
              ...tags,
              type: planned.type,
              wordCount: planned.wordCount,
              sampleRootId: planned.sampleWord?.rootId,
            },
          },
          trigger:
            tags && Platform.OS === 'ios'
              ? {
                  type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                  timezone: 'UTC',
                  repeats: false,
                  year: planned.fireDate.getUTCFullYear(),
                  month: planned.fireDate.getUTCMonth() + 1,
                  day: planned.fireDate.getUTCDate(),
                  hour: planned.fireDate.getUTCHours(),
                  minute: planned.fireDate.getUTCMinutes(),
                  second: 0,
                }
              : {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: planned.fireDate,
                  channelId: Platform.OS === 'android' ? 'reminders' : undefined,
                },
        });
        acknowledged?.add(identifier);
        scheduledCount++;
      } catch (error) {
        await Notifications.cancelScheduledNotificationAsync(planned.identifier).catch(
          () => undefined,
        );
        void handleError(error, {
          showToast: false,
          analyticsEventName: ANALYTICS_EVENTS.REMINDER_SCHEDULING_ERROR,
        });
      }
    }

    // Never from the background task, whose run is not a use of the app.
    if (trigger !== BACKGROUND_SYNC_TRIGGER && scheduledCount !== lastReportedScheduledCount) {
      lastReportedScheduledCount = scheduledCount;
      void analytics.track(ANALYTICS_EVENTS.SMART_REMINDERS_SYNCED, {
        scheduledCount,
        planned: plan.length,
        horizonDays: SMART_NOTIFICATIONS.HORIZON_DAYS,
        trigger,
      });
    }
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
  stillCurrent?: () => boolean | Promise<boolean>,
): Promise<number> {
  if (!prefs.owner) return syncSmartNotifications(makeReminderPlan(words, prefs), trigger);
  return (await syncVerifiedReminderPlan(words, prefs, prefs.owner, trigger, stillCurrent)).times
    .length;
}

export function makeReminderPlan(words: StudyWord[], prefs: SmartReminderMirror) {
  return buildNotificationPlan({
    words,
    now: new Date(),
    preferredHour: prefs.hour,
    preferredMinute: prefs.minute,
    lastSessionCompletedAt: prefs.lastSessionCompletedAt,
  });
}

const unavailable: ReminderAccess = {
  full: false,
  channel: false,
  canAskAgain: false,
  raw: 'unavailable',
};

export async function readReminderAccess(): Promise<ReminderAccess> {
  if (!Notifications) return unavailable;
  try {
    const permission = await Notifications.getPermissionsAsync();
    const channel =
      Platform.OS !== 'android' ||
      Number(Platform.Version) < 26 ||
      ((await Notifications.getNotificationChannelAsync(REMINDER_CHANNEL))?.importance ?? 0) >
        Notifications.AndroidImportance.NONE;
    const full =
      Platform.OS === 'ios'
        ? permission.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
        : Platform.OS === 'android' && permission.status === 'granted';
    return {
      full,
      channel,
      canAskAgain: permission.canAskAgain,
      raw:
        Platform.OS === 'ios' ? String(permission.ios?.status ?? 'unavailable') : permission.status,
    };
  } catch {
    return unavailable;
  }
}

export async function requestReviewReminder(attemptId: string, source: string) {
  await initializeNotifications();
  let access = await readReminderAccess();
  const prompted = !!Notifications && !access.full && access.canAskAgain;
  if (Notifications && prompted) {
    void analytics.track(ANALYTICS_EVENTS.PERMISSION_PROMPT_SHOWN, {
      permission: 'notifications',
      primed: false,
      attempt_id: attemptId,
      source,
    });
    try {
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: false },
      });
      access = await readReminderAccess();
    } catch {
      access = unavailable;
    }
  }
  void analytics.track(ANALYTICS_EVENTS.PERMISSION_RESULT, {
    permission: 'notifications',
    primed: false,
    prompted,
    attempt_id: attemptId,
    source,
    raw_authorization: access.raw,
    canAskAgain: access.canAskAgain,
    granted: access.full,
    channel_available: access.channel,
  });
  registerNotificationsEnabled(access.full && access.channel);
  return access;
}

export function syncVerifiedReminderPlan(
  words: StudyWord[],
  prefs: SmartReminderMirror,
  owner: string,
  trigger: string,
  stillCurrent: () => boolean | Promise<boolean> = () => true,
  enabling = false,
): Promise<ReminderObservation> {
  return planQueue(async () => {
    const current = async () => !(await teardownPending()) && (await stillCurrent());
    const plan = makeReminderPlan(words, prefs);
    const revision = reminderRevision(plan, prefs.lastSessionCompletedAt);
    const result: ReminderObservation = {
      revision,
      enabled: prefs.enabled,
      access: unavailable,
      times: [],
      result: 'error',
    };
    if (!(await current()) || !Notifications) return result;
    if (widgetBridge && !widgetBridge.beginPublication(owner)) return result;
    try {
      try {
        await initializeNotifications();
        const access = await readReminderAccess();
        result.access = access;
        if (!(await current())) return result;
        if (!prefs.enabled || !access.full || !access.channel) {
          await recordReminderObservation(owner).catch(() => undefined);
          if (
            prefs.enabled &&
            access.raw === String(Notifications.IosAuthorizationStatus.PROVISIONAL) &&
            Platform.OS === 'ios'
          ) {
            await replaceSmartNotifications(
              plan,
              trigger,
              { reminderOwner: owner, planRevision: revision },
              undefined,
              current,
            );
          } else await cancelManagedNotifications(Notifications);
          result.result =
            !prefs.enabled && !enabling
              ? 'disabled'
              : access.raw === 'unavailable'
                ? 'error'
                : 'restricted';
        } else {
          const acknowledged = new Set<string>();
          await replaceSmartNotifications(
            plan,
            trigger,
            {
              reminderOwner: owner,
              planRevision: revision,
            },
            acknowledged,
            current,
          );
          const pending = await Notifications.getAllScheduledNotificationsAsync();
          result.access = await readReminderAccess();
          if (!result.access.full || !result.access.channel)
            result.result = result.access.raw === 'unavailable' ? 'error' : 'restricted';
          else {
            result.times = verifiedReminderTimes(
              owner,
              revision,
              plan,
              pending.filter(r => acknowledged.has(r.identifier)),
              Date.now(),
            );
            result.result = result.times.length ? 'verified' : 'empty';
          }
        }
      } catch {
        result.result = 'error';
      }
      if (await current()) await publishReminder(owner, result);
      else {
        // The account, grade or preference changed while the OS write was in flight.
        // Remove only this obsolete revision, including after a headless wake.
        await cancelManagedNotifications(Notifications, { owner, revision }).catch(() => undefined);
        result.times = [];
        result.result = 'empty';
      }
      return result;
    } finally {
      widgetBridge?.endPublication();
    }
  });
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
    // so pass its answer through rather than claiming success. Not an event: a
    // rejection is the normal state of every install without notifications,
    // which the `notifications_enabled` super property already says.
    return await Notifications.setBadgeCountAsync(validCount);
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

/** Where an ask for the notification permission came from. */
export type NotificationPermissionSource = 'review_complete' | 'first_word_saved' | 'settings';

export interface NotificationPermissionAsk {
  source: NotificationPermissionSource;
  /** A priming card explained the reminders before the OS dialog could appear */
  primed: boolean;
}

/** The OS grant, on every event from now on. */
const registerNotificationsEnabled = (granted: boolean): void => {
  void analytics.registerSuperProperties({ [SUPER_PROPERTIES.NOTIFICATIONS_ENABLED]: granted });
};

/**
 * Read the OS grant again and put it on every event (`notifications_enabled`):
 * at launch and on every return to the foreground, since the learner can change
 * it in system settings at any time. Check-only.
 */
export async function refreshNotificationsEnabled(): Promise<void> {
  registerNotificationsEnabled((await getPermissionStatus()) === 'granted');
}

const reportPermissionResult = (
  granted: boolean,
  prompted: boolean,
  { source, primed }: NotificationPermissionAsk,
): void => {
  void analytics.track(ANALYTICS_EVENTS.PERMISSION_RESULT, {
    permission: 'notifications',
    granted,
    primed,
    prompted,
    source,
  });
  registerNotificationsEnabled(granted);
};

/**
 * Whether reminders may be delivered, asking the OS only when the answer is
 * still open. A granted or final answer is returned as it stands (Expo best
 * practice: check before requesting); an undetermined one shows the dialog.
 *
 * Every ask is a `Permission Result`, with `prompted` saying whether a dialog
 * appeared; `Permission Prompt Shown` goes out only when one is about to.
 */
export async function ensurePermissions(ask: NotificationPermissionAsk): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const current = toPermissionStatus(Notifications, await Notifications.getPermissionsAsync());
    if (current !== 'undetermined') {
      reportPermissionResult(current === 'granted', false, ask);
      return current === 'granted';
    }

    void analytics.track(ANALYTICS_EVENTS.PERMISSION_PROMPT_SHOWN, {
      permission: 'notifications',
      primed: ask.primed,
      source: ask.source,
    });
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

    const granted = toPermissionStatus(Notifications, requested) === 'granted';
    reportPermissionResult(granted, true, ask);
    return granted;
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Notification_Permission_Error',
    });
    return false;
  }
}
