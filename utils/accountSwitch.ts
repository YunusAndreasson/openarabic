import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS, sharedAccountStorageKeys } from '@/constants/storageKeys';
import { resetNotificationPromptState } from '@/utils/notificationPromptStorage';

/**
 * Record `userId` as the account now signed in on this device, and report
 * whether it replaced a DIFFERENT one.
 *
 * Several stores hold one learner's data under keys that carry no user id: the
 * streak ledger, the recall history behind new-word pacing, today's add count,
 * the reminder prefs. Signing out leaves them — deliberately, since the same
 * learner signing back in must find their streak where they left it. The cost
 * was that a second account on the device inherited all of it. So the sweep
 * happens here instead, at the one moment the data is known to be someone
 * else's: when the incoming id differs from the last one seen.
 *
 * Resolves `true` when a switch was detected and the shared keys were removed,
 * so the caller can reset the matching in-memory state.
 */
export async function claimDeviceForAccount(userId: string): Promise<boolean> {
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
}
