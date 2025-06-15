import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleError } from './errorHandling';

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
    handleError(new Error('AsyncStorage unavailable, persistence disabled'), {
      showToast: false,
    });
    hasLoggedWarning = true;
  }

  return fallbackStorage;
};
