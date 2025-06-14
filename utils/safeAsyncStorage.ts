import AsyncStorage from '@react-native-async-storage/async-storage';

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
    console.warn('AsyncStorage unavailable, persistence disabled');
    hasLoggedWarning = true;
  }

  return fallbackStorage;
};
