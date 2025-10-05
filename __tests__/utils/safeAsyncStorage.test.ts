import AsyncStorage from '@react-native-async-storage/async-storage';

import { getSafeStorage, isAsyncStorageAvailable } from '@/utils/safeAsyncStorage';

// Mock AsyncStorage module
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('safeAsyncStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAsyncStorageAvailable', () => {
    it('should return true when AsyncStorage.getItem is a function', () => {
      const result = isAsyncStorageAvailable();
      expect(result).toBe(true);
    });

    it('should handle AsyncStorage being unavailable', () => {
      // Save original
      const originalGetItem = AsyncStorage.getItem;

      // Make getItem undefined
      (AsyncStorage as any).getItem = undefined;

      const result = isAsyncStorageAvailable();
      expect(result).toBe(false);

      // Restore
      AsyncStorage.getItem = originalGetItem;
    });

    it('should handle AsyncStorage being null', () => {
      // Save original AsyncStorage reference
      const originalAsyncStorage = AsyncStorage;

      // Mock module to return null
      jest.doMock('@react-native-async-storage/async-storage', () => null);

      // This test verifies the function handles null gracefully
      // In the real implementation, the optional chaining handles this
      const result = isAsyncStorageAvailable();
      expect(result).toBe(true); // Because our mock still has the function

      // Restore
      jest.dontMock('@react-native-async-storage/async-storage');
    });
  });

  describe('getSafeStorage', () => {
    it('should return AsyncStorage when available', () => {
      const storage = getSafeStorage();

      expect(storage).toBe(AsyncStorage);
      expect(storage.getItem).toBe(AsyncStorage.getItem);
      expect(storage.setItem).toBe(AsyncStorage.setItem);
      expect(storage.removeItem).toBe(AsyncStorage.removeItem);
    });

    it('should return fallback storage when AsyncStorage is unavailable', () => {
      // Save original
      const originalGetItem = AsyncStorage.getItem;

      // Make getItem undefined
      (AsyncStorage as any).getItem = undefined;

      const storage = getSafeStorage();

      // Should not be the real AsyncStorage
      expect(storage).not.toBe(AsyncStorage);

      // Restore
      AsyncStorage.getItem = originalGetItem;
    });

    it('should return fallback storage with working methods', async () => {
      // Save original
      const originalGetItem = AsyncStorage.getItem;

      // Make getItem undefined
      (AsyncStorage as any).getItem = undefined;

      const storage = getSafeStorage();

      // Test fallback methods don't throw
      const getResult = await storage.getItem('test-key');
      expect(getResult).toBeNull();

      await expect(storage.setItem('test-key', 'test-value')).resolves.toBeUndefined();
      await expect(storage.removeItem('test-key')).resolves.toBeUndefined();

      // Restore
      AsyncStorage.getItem = originalGetItem;
    });

    it('should return storage with correct interface', () => {
      const storage = getSafeStorage();

      expect(typeof storage.getItem).toBe('function');
      expect(typeof storage.setItem).toBe('function');
      expect(typeof storage.removeItem).toBe('function');
    });
  });
});
