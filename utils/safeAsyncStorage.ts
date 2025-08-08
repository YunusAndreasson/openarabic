import AsyncStorage from '@react-native-async-storage/async-storage';

import { STRINGS } from '@/constants/strings';

import { handleError } from './errorHandling';

let hasLoggedWarning = false;

export const isAsyncStorageAvailable = (): boolean => {
  try {
    return typeof AsyncStorage?.getItem === 'function';
  } catch {
    return false;
  }
};

type StorageLike = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

const fallbackStorage: StorageLike = {
  async getItem(_key: string) {
    return null;
  },
  async setItem(_key: string, _value: string) {
    // no-op
  },
  async removeItem(_key: string) {
    // no-op
  },
};

export const getSafeStorage = (): StorageLike => {
  if (isAsyncStorageAvailable()) {
    return AsyncStorage;
  }

  if (!hasLoggedWarning) {
    handleError(new Error(STRINGS.ERROR_ASYNC_STORAGE_UNAVAILABLE), {
      showToast: false,
    });
    hasLoggedWarning = true;
  }

  return fallbackStorage;
};
