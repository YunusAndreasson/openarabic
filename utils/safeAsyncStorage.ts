import AsyncStorage from '@react-native-async-storage/async-storage';

import { STRINGS } from '@/constants/strings';

import { handleError } from './errorHandling';

// Removed hasLoggedWarning - no longer needed with explicit failure

export const isAsyncStorageAvailable = (): boolean => {
  try {
    return typeof AsyncStorage?.getItem === 'function';
  } catch (storageCheckError) {
    console.error('CRITICAL: Failed to check AsyncStorage availability:', storageCheckError);
    throw new Error(`AsyncStorage availability check failed: ${storageCheckError}`);
  }
};

type StorageLike = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

// Removed fallbackStorage - we now fail explicitly when AsyncStorage is unavailable

export const getSafeStorage = (): StorageLike => {
  if (isAsyncStorageAvailable()) {
    return AsyncStorage;
  }

  const storageError = new Error(STRINGS.ERROR_ASYNC_STORAGE_UNAVAILABLE);
  console.error('CRITICAL: AsyncStorage is not available:', storageError);

  // Always show this error to users since storage is critical
  handleError(storageError, {
    showToast: true,
    toastMessage: 'Storage system is unavailable. The app may not work properly.',
  });

  // Throw error to make it clear storage is broken
  throw storageError;
};
