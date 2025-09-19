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
          data: { dueWordsCount: dueWords.length },
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
      // Register the background task
      await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15, // 15 minutes minimum interval
      });

      // Background task registered successfully
    } else {
      // Background task is not available on this device
    }
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Registration_Error',
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
