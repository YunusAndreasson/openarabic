import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS, sharedAccountStorageKeys } from '@/constants/storageKeys';
import { resetNotificationPromptState } from '@/utils/notificationPromptStorage';

import { createSerialQueue } from '@/utils/createSerialQueue';

const enqueueClaim = createSerialQueue();

/**
 * Record `userId` as the account now signed in on this device, and report
 * whether it replaced a DIFFERENT one.
 *
 * A session may change directly, or the install may come from an older
 * binary. Sweep their shared keys before publishing the incoming session.
 *
 * Resolves `true` when a switch was detected and the shared keys were removed,
 * so the caller can reset the matching in-memory state.
 */
export function claimDeviceForAccount(userId: string): Promise<boolean> {
  return enqueueClaim(async () => {
    const previousUserId = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SIGNED_IN_USER);
    if (previousUserId === userId) return false;

    const switched = previousUserId !== null;
    if (switched) {
      await AsyncStorage.multiRemove(sharedAccountStorageKeys());
      // The one module that caches a removed key in memory. Left alone, it kept
      // serving the previous account's prompt state and wrote it back under the
      // new account at the next update.
      resetNotificationPromptState();
    }
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SIGNED_IN_USER, userId);
    return switched;
  });
}
