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
 * - Mock BackgroundTask.getStatusAsync() to test different scenarios
 * - Focus on: error handling, graceful fallback, status checks
 * - Don't test Expo Background Task internals (third-party responsibility)
 *
 * Configuration Requirements (Optional):
 * - iOS: UIBackgroundModes = ['fetch'] in Info.plist
 * - Android: Permissions and background service configuration
 * - If missing, app silently continues without background updates
 */

import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import type * as NotificationsModule from 'expo-notifications';

// expo-notifications is unavailable in Expo Go on Android (SDK 53+).
let Notifications: typeof NotificationsModule | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications unavailable in Expo Go on Android (SDK 53+)
}
import * as TaskManager from 'expo-task-manager';

import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

// Background task name
const BACKGROUND_FETCH_TASK = 'background-due-words-calculation';

/**
 * Background task to calculate and update due words
 * This runs even when the app is closed
 * Note: This is a simplified version that works with client-side authentication
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // Check network connectivity before making any requests
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      // No network - fail silently (expected in background)
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }

    // Calculate current due words for the authenticated user
    const dueWords = await studyWordsFSRSService.getFSRSWords(session.user.id, {
      onlyDue: true,
      sessionCooldownHours: 1,
      limit: 100,
    });

    const dueCount = dueWords?.length ?? 0;

    // Keep the home-screen icon badge current even while the app is closed: set it
    // to the due-words count, or clear it to 0 once the learner is caught up.
    // Best-effort — no-ops without badge permission / on launchers that don't
    // support numeric badges.
    if (Notifications) {
      try {
        await Notifications.setBadgeCountAsync(Math.max(0, dueCount));
      } catch {
        // Unsupported launcher / revoked permission — leave the badge as-is.
      }
    }

    if (dueCount > 0 && Notifications) {
      // Schedule local notification for due words (badge baked in so the OS also
      // sets the icon count when this is delivered).
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Words Ready for Review',
          body: `You have ${dueCount} words ready for practice`,
          badge: dueCount,
          data: {
            dueWordsCount: dueCount,
            type: 'study-reminder',
          },
        },
        trigger: null, // Show immediately
      });
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    // Check if it's a network error - these are expected in background
    const errorMessage = error instanceof Error ? error.message : String(error);
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
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Error',
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
    // Check if background task is available
    const status = await BackgroundTask.getStatusAsync();

    if (status === BackgroundTask.BackgroundTaskStatus.Available) {
      // Register the background task with minimum 15-minute interval
      await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15, // 15 minutes
      });

      // Background task registered successfully
    } else {
      // Background task is not available on this device
      // Silently skip - this is expected when Background Fetch is not configured
    }
  } catch (error) {
    // Handle specific error about Background Fetch not being configured
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNotConfiguredError =
      errorMessage.includes('Background Fetch has not been configured') ||
      errorMessage.includes('UIBackgroundModes') ||
      errorMessage.includes('registerTaskAsync');

    if (isNotConfiguredError) {
      // Silently ignore - Background Fetch is optional and not configured
      return;
    }

    // Log other errors to Sentry with warning severity (not critical)
    handleError(error as Error, {
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
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Unregistration_Error',
    });
  }
}
