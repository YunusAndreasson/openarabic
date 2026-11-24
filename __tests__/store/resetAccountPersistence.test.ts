import AsyncStorage from '@react-native-async-storage/async-storage';
import { expect, jest, test } from '@jest/globals';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { resetAccountPersistence } from '@/store/resetAccountPersistence';
import { persistor, store } from '@/store/store';

jest.mock('@/store/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: () => ({
      theme: { appearance: 'dark' },
      firstPage: { returningInstall: true },
      _persist: { version: 3 },
      voiceAliases: { private: 'word' },
    }),
  },
  persistor: { flush: jest.fn() },
}));
test('cleanup explicitly replaces the mixed Redux blob even if redux-persist swallowed a write failure', async () => {
  let disk = 'private word and playlist';
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    if (key === STORAGE_KEYS.REDUX_PERSIST_ROOT) disk = value;
  });
  await resetAccountPersistence();
  expect(store.dispatch).toHaveBeenCalledTimes(2);
  expect(persistor.flush).toHaveBeenCalled();
  expect(disk).not.toContain('private');
  expect(JSON.parse(JSON.parse(disk).theme)).toEqual({ appearance: 'dark' });
});
