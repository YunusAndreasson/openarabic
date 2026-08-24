/**
 * Tutorial storage utilities
 * Handles AsyncStorage operations for tutorial completion state with fail-safe error handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { TUTORIALS, type TutorialId } from '@/constants/tutorials';
import { handleError } from '@/utils/errorHandling';
import { scopedKey } from '@/constants/storageKeys';

/**
 * Check if a tutorial has been completed
 * FAIL-SAFE: Returns true (completed) on error to avoid spamming users with tutorials
 *
 * @param tutorialId - The tutorial to check
 * @returns true if completed, true on error (fail-safe)
 */
async function isTutorialCompleted(
  tutorialId: TutorialId,
  userId?: string | null,
): Promise<boolean> {
  try {
    const config = TUTORIALS[tutorialId];
    const value = await AsyncStorage.getItem(scopedKey(config.storageKey, userId));
    return value === 'true';
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Tutorial_Storage_Read_Error',
    });
    // Fail-safe: default to completed to avoid tutorial spam
    return true;
  }
}

/**
 * Mark a tutorial as completed
 *
 * @param tutorialId - The tutorial to mark as completed
 */
export async function markTutorialCompleted(
  tutorialId: TutorialId,
  userId?: string | null,
): Promise<void> {
  try {
    const config = TUTORIALS[tutorialId];
    await AsyncStorage.setItem(scopedKey(config.storageKey, userId), 'true');
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Tutorial_Storage_Write_Error',
    });
  }
}

/**
 * Reset all tutorials (clear completion state)
 * Used by "Show tutorials again" feature in Account settings
 */
export async function resetAllTutorials(userId?: string | null): Promise<void> {
  try {
    const tutorialIds = Object.keys(TUTORIALS) as TutorialId[];
    await Promise.all(
      tutorialIds.map(id => {
        const config = TUTORIALS[id];
        return AsyncStorage.removeItem(scopedKey(config.storageKey, userId));
      }),
    );
  } catch (error) {
    void handleError(error, {
      showToast: false,
      analyticsEventName: 'Tutorial_Storage_Reset_Error',
    });
    throw error; // Re-throw so caller can show error to user
  }
}

/**
 * Load all tutorial completion states
 * Used for initial state hydration in useTutorialManager
 *
 * @returns Map of tutorialId to completion state
 */
export async function loadAllTutorialStates(
  userId?: string | null,
): Promise<Record<TutorialId, boolean>> {
  const tutorialIds = Object.keys(TUTORIALS) as TutorialId[];
  const states = await Promise.all(tutorialIds.map(id => isTutorialCompleted(id, userId)));

  const stateMap = {} as Record<TutorialId, boolean>;
  tutorialIds.forEach((id, index) => {
    stateMap[id] = states[index] ?? false;
  });

  return stateMap;
}
