import { submitPublicWidget } from '@/services/widgets/publicHost';
import { initialFace } from '@/constants/widgetEdition';
import { teardownPending } from '@/services/accountTeardown';
import { widgetBridge } from '@/services/widgets/native';
import {
  clearWordWidget,
  currentWidgetRevision,
  publishDeck,
  resumeWidgetGeneration,
} from '@/services/widgets/publish';
import { widgetInstallTime } from '@/services/widgets/placement';
/**
 * Background Tasks Service
 * Background fetch for vocabulary due date calculations
 *
 * GRACEFUL DEGRADATION PATTERN
 * =============================
 * This service is designed to work when possible, fail gracefully when not.
 * Background fetch is an optional enhancement, not a core requirement.
 *
 * Why Graceful Degradation:
 * - Background Fetch requires specific iOS/Android configuration
 * - Missing UIBackgroundModes in Info.plist is expected in some builds
 * - User permissions for background activity may be denied
 * - Background tasks may be throttled by OS (battery optimization)
 * - App works perfectly fine without background updates
 *
 * Expected Behavior:
 * - ✅ Not configured → silent no-op (missing config is OK)
 * - ✅ Permission denied → silent no-op (user choice respected)
 * - ✅ OS throttling → silent no-op (system resource management)
 * - ✅ Task fails → log error but don't crash
 * - ❌ NEVER blocks app startup or crashes app
 * - ⚠️  Logs non-configuration errors to Sentry with "warning" severity
 *
 * Testing Implications:
 * - Tests should verify "does not throw" for expected failures
 * - Mock BackgroundTask.registerTaskAsync() to test different scenarios
 * - Focus on: error handling, graceful fallback
 * - Don't test Expo Background Task internals (third-party responsibility)
 *
 * Configuration Requirements (Optional):
 * - iOS: UIBackgroundModes includes 'processing', and BGTaskSchedulerPermittedIdentifiers
 *   includes 'com.expo.modules.backgroundtask.processing' (the expo-background-task
 *   config plugin adds both)
 * - Android: Permissions and background service configuration
 * - If missing, app silently continues without background updates
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import {
  BACKGROUND_SYNC_TRIGGER,
  setAppBadgeCount,
  syncReminderPlan,
} from '@/services/notificationService';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { isKnownOffline } from '@/utils/network';
import { readSmartReminderPrefs } from '@/utils/smartReminderPrefs';
import { toError } from '@/utils/toError';
import { isDueAt } from '@/utils/wordClassification';

// Background task name
const BACKGROUND_FETCH_TASK = 'background-due-words-calculation';

/**
 * Background task to calculate and update due words
 * This runs even when the app is closed
 * Note: This is a simplified version that works with client-side authentication
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    if (await teardownPending()) return BackgroundTask.BackgroundTaskResult.Failed;
    // Check if user is authenticated
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      if (!sessionError) {
        clearWordWidget();
        await submitPublicWidget('WordInContext', initialFace.arabic);
      }
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Check network connectivity before making any requests
    if (await isKnownOffline()) {
      // No network - fail silently (expected in background)
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Full word set (with the root relation) so the plan matches what the
    // foreground hook computes — including word-personalized copy.
    const widgetRevision = currentWidgetRevision();
    const words = await studyWordsFSRSService.getFSRSWords(session.user.id, {
      forStats: false,
    });

    // One clock for the whole pass, and the SHARED due rule — this used to be an
    // inline copy that called `Date.parse` on the raw column. Postgres can hand
    // back a stamp with no UTC offset, which `Date.parse` reads as device-local,
    // so the badge this count feeds could be hours out of step with the number
    // the app itself shows, in whichever direction the learner is from UTC.
    if (await teardownPending()) return BackgroundTask.BackgroundTaskResult.Failed;
    if (widgetBridge && !widgetBridge.beginPublication(session.user.id))
      return BackgroundTask.BackgroundTaskResult.Failed;
    try {
      const nowMs = Date.now();
      if (widgetBridge) {
        try {
          const first = await widgetInstallTime();
          const latest = await supabase.auth.getSession();
          if (
            latest.data.session?.user.id === session.user.id &&
            (await resumeWidgetGeneration(session.user.id, widgetRevision))
          ) {
            await publishDeck(session.user.id, words, nowMs, first);
          }
        } catch {
          /* Widget availability is independent of background badge and reminder updates. */
        }
      }
      const dueCount = words.filter(word => isDueAt(word, nowMs)).length;

      // Keep the home-screen icon badge current even while the app is closed: set it
      // to the due-words count, or clear it to 0 once the learner is caught up.
      // Best-effort — no-ops without badge permission / on launchers that don't
      // support numeric badges.
      await setAppBadgeCount(dueCount);
    } finally {
      widgetBridge?.endPublication();
    }

    // Refresh the forward smart-reminder plan headlessly. The foreground hook
    // is the primary scheduler; this run corrects multi-device staleness.
    const prefs = await readSmartReminderPrefs();
    if (prefs?.enabled && (!prefs.owner || prefs.owner === session.user.id)) {
      await syncReminderPlan(
        words,
        { ...prefs, owner: session.user.id },
        BACKGROUND_SYNC_TRIGGER,
        async () => {
          const current = await supabase.auth.getSession();
          const latest = await readSmartReminderPrefs();
          return (
            current.data.session?.user.id === session.user.id &&
            latest?.enabled === true &&
            (!latest.owner || latest.owner === session.user.id) &&
            latest.hour === prefs.hour &&
            latest.minute === prefs.minute &&
            latest.lastSessionCompletedAt === prefs.lastSessionCompletedAt
          );
        },
      );
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    // Check if it's a network error - these are expected in background
    const errorMessage = toError(error).message;
    const isNetworkError =
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT');

    if (isNetworkError) {
      // Network errors in background are expected - fail silently
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Log other errors to Sentry (unexpected errors)
    void handleError(error, {
      showToast: false,
      analyticsEventName: ANALYTICS_EVENTS.BACKGROUND_TASK_ERROR,
      sentrySeverity: 'warning',
    });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundTasks(): Promise<void> {
  try {
    // No availability pre-check: registerTaskAsync already returns early when
    // the status is Restricted (simulators, Expo Go) or the task is registered.
    // Register the background task with minimum 15-minute interval
    await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15, // 15 minutes
    });
  } catch (error) {
    // The module's own messages for a build without the background mode
    // ("Background Task has not been configured. To enable it, add `process`
    // to `UIBackgroundModes`…") and for a missing native module (an
    // UnavailabilityError naming registerTaskAsync).
    const errorMessage = toError(error).message;
    const isNotConfiguredError =
      errorMessage.includes('Background Task has not been configured') ||
      errorMessage.includes('UIBackgroundModes') ||
      errorMessage.includes('registerTaskAsync');

    if (isNotConfiguredError) {
      // Silently ignore - background tasks are optional and not configured
      return;
    }

    // Log other errors to Sentry with warning severity (not critical)
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Registration_Error',
      sentrySeverity: 'warning', // Not critical - background fetch is optional
    });
  }
}

/**
 * Unregister background task
 */
export async function unregisterBackgroundTasks(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    // Background task unregistered
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Unregistration_Error',
    });
  }
}
