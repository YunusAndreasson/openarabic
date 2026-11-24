import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Re-arm a fresh disk after Jest's per-test mock reset. */
export function mockReviewStorage() {
  const disk = new Map<string, string>();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => disk.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    disk.set(key, value);
  });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async key => {
    disk.delete(key);
  });
}
