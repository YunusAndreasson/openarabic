import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { STORAGE_KEYS, scopedKey } from '@/constants/storageKeys';
import { claimDeviceForAccount } from '@/utils/accountSwitch';

const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);
const multiRemove = jest.mocked(AsyncStorage.multiRemove);

describe('claimDeviceForAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setItem.mockResolvedValue(undefined);
    multiRemove.mockResolvedValue(undefined);
  });

  test('first sign-in on a device records the owner and removes nothing', async () => {
    getItem.mockResolvedValue(null);

    expect(await claimDeviceForAccount('user-a')).toBe(false);

    expect(multiRemove).not.toHaveBeenCalled();
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.LAST_SIGNED_IN_USER, 'user-a');
  });

  test('the same learner signing back in keeps their streak ledger', async () => {
    getItem.mockResolvedValue('user-a');

    expect(await claimDeviceForAccount('user-a')).toBe(false);

    expect(multiRemove).not.toHaveBeenCalled();
  });

  test('a different account does not inherit the previous one’s unscoped data', async () => {
    getItem.mockResolvedValue('user-a');

    expect(await claimDeviceForAccount('user-b')).toBe(true);

    const removed = multiRemove.mock.calls[0]?.[0] ?? [];
    expect(removed).toEqual(
      expect.arrayContaining([
        STORAGE_KEYS.STUDY_DAYS,
        STORAGE_KEYS.RECENT_RECALL_SESSIONS,
        STORAGE_KEYS.DAILY_WORD_COUNT,
        STORAGE_KEYS.DAILY_WORD_RESET_DATE,
        STORAGE_KEYS.SMART_REMINDER_PREFS,
      ]),
    );
    // Keys namespaced by user cannot leak, and user A may come back; the owner
    // marker and the redux blob are the device's.
    expect(removed).not.toContain(scopedKey(STORAGE_KEYS.ONBOARDING_PROGRESS, 'user-a'));
    expect(removed).not.toContain(STORAGE_KEYS.LAST_SIGNED_IN_USER);
    expect(removed).not.toContain(STORAGE_KEYS.REDUX_PERSIST_ROOT);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.LAST_SIGNED_IN_USER, 'user-b');
  });
});
