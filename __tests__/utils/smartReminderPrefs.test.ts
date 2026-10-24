/**
 * The headless mirror of the reminder setting: what the background task reads
 * when no Redux store is running.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockStore.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockStore.set(key, value);
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readSmartReminderPrefs, writeSmartReminderPrefs } from '@/utils/smartReminderPrefs';

const KEY = STORAGE_KEYS.SMART_REMINDER_PREFS;

beforeEach(() => {
  mockStore.clear();
});

describe('smartReminderPrefs', () => {
  test('nothing mirrored yet reads as absent', async () => {
    expect(await readSmartReminderPrefs()).toBeNull();
  });

  test('round-trips the setting and the session cooldown', async () => {
    await writeSmartReminderPrefs({
      hour: 19,
      minute: 30,
      enabled: true,
      lastSessionCompletedAt: 1_700_000_000_000,
    });

    expect(await readSmartReminderPrefs()).toEqual({
      hour: 19,
      minute: 30,
      enabled: true,
      lastSessionCompletedAt: 1_700_000_000_000,
    });
  });

  test('stores the same bytes it always did, with no cooldown key when there is none', async () => {
    await writeSmartReminderPrefs({
      hour: 8,
      minute: 0,
      enabled: false,
      lastSessionCompletedAt: undefined,
    });

    expect(mockStore.get(KEY)).toBe('{"hour":8,"minute":0,"enabled":false}');
  });

  test('a mirror missing a setting field is not usable', async () => {
    mockStore.set(KEY, '{"hour":8,"enabled":true}');

    expect(await readSmartReminderPrefs()).toBeNull();
  });

  test('a cooldown of the wrong type is dropped, the setting kept', async () => {
    mockStore.set(KEY, '{"hour":8,"minute":15,"enabled":true,"lastSessionCompletedAt":"soon"}');

    const prefs = await readSmartReminderPrefs();
    expect(prefs).toEqual({ hour: 8, minute: 15, enabled: true });
    expect(prefs?.lastSessionCompletedAt).toBeUndefined();
  });

  test('a corrupt mirror reads as absent', async () => {
    mockStore.set(KEY, '{broken');

    expect(await readSmartReminderPrefs()).toBeNull();
  });
});
