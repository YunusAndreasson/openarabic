import * as BackgroundFetch from 'expo-background-fetch';
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
      return BackgroundFetch.BackgroundFetchResult.Failed;
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

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Background_Task_Error',
    });
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundTasks(): Promise<void> {
  try {
    // Check if background fetch is available
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      // Register the background task with minimum 15-minute interval
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 60 * 15, // 15 minutes in seconds
        stopOnTerminate: false, // Continue running even after app is terminated
        startOnBoot: true, // Start task when device boots
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
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
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
    const status = await BackgroundFetch.getStatusAsync();
    return status === BackgroundFetch.BackgroundFetchStatus.Available;
  } catch {
    return false;
  }
}
