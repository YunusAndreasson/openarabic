import AsyncStorage from '@react-native-async-storage/async-storage';

import { handleError } from './errorHandling';
import { STRINGS } from '@/constants/strings';

let hasLoggedWarning = false;

export const isAsyncStorageAvailable = (): boolean => {
  try {
    return typeof AsyncStorage?.getItem === 'function';
  } catch {
    return false;
  }
};

const fallbackStorage = {
  async getItem() {
    return null as string | null;
  },
  async setItem() {
    // no-op
  },
  async removeItem() {
    // no-op
  },
};

export const getSafeStorage = () => {
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
