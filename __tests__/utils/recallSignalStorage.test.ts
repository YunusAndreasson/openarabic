/**
 * The rolling recall window behind adaptive new-word pacing.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockStore.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockStore.set(key, value);
  },
}));

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { appendSession, readRecentRecall } from '@/utils/recallSignalStorage';

const KEY = STORAGE_KEYS.RECENT_RECALL_SESSIONS;

beforeEach(() => {
  mockStore.clear();
});

describe('recallSignalStorage', () => {
  test('no history is warming-up: no trials, no rate', async () => {
    expect(await readRecentRecall()).toEqual({ recall: 0, trials: 0 });
  });

  test('sums the recorded sessions into one rate', async () => {
    await appendSession(3, 1);
    await appendSession(1, 3);

    expect(await readRecentRecall()).toEqual({ recall: 0.5, trials: 8 });
  });

  test('a session with nothing graded is not recorded', async () => {
    await appendSession(0, 0);

    expect(mockStore.has(KEY)).toBe(false);
  });

  test('keeps only the ten most recent sessions', async () => {
    for (let session = 0; session < 12; session += 1) {
      await appendSession(1, 0);
    }
    await appendSession(0, 1);

    const stored: unknown[] = JSON.parse(mockStore.get(KEY) ?? '[]');
    expect(stored).toHaveLength(10);
    expect(await readRecentRecall()).toEqual({ recall: 0.9, trials: 10 });
  });

  test('stores the array of entries it always did', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await appendSession(2, 1);

    expect(mockStore.get(KEY)).toBe('[{"known":2,"unknown":1,"at":1700000000000}]');
  });

  test('skips malformed entries and survives a corrupt blob', async () => {
    mockStore.set(KEY, '[{"known":1,"unknown":1,"at":1},{"known":"x"},null]');
    expect(await readRecentRecall()).toEqual({ recall: 0.5, trials: 2 });

    mockStore.set(KEY, '{broken');
    expect(await readRecentRecall()).toEqual({ recall: 0, trials: 0 });
  });
});
