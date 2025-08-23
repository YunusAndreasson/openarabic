import AsyncStorage from '@react-native-async-storage/async-storage';

// No longer need these imports since we provide a graceful fallback

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

  // Provide a fallback that doesn't crash the app during initialization
  console.warn('AsyncStorage not available, using null storage fallback');

  // Create a simple storage fallback that returns null/undefined but doesn't crash
  const nullStorage: StorageLike = {
    getItem: async (): Promise<string | null> => null,
    setItem: async (): Promise<void> => Promise.resolve(),
    removeItem: async (): Promise<void> => Promise.resolve(),
  };

  return nullStorage;
};
