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

import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
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

    if (dueWords && dueWords.length > 0) {
      // Schedule local notification for due words
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Words Ready for Review',
          body: `You have ${dueWords.length} words ready for practice`,
          data: {
            dueWordsCount: dueWords.length,
            type: 'study-reminder',
          },
        },
        trigger: null, // Show immediately
      });

      return BackgroundTask.BackgroundTaskResult.Success;
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Error',
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

/**
 * Check if background task is available
 */
export async function isBackgroundTaskAvailable(): Promise<boolean> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    return status === BackgroundTask.BackgroundTaskStatus.Available;
  } catch {
    return false;
  }
}
