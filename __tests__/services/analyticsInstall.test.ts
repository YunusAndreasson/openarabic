/**
 * The install record analytics keeps apart from any account: the install date,
 * the one First Open, and which core actions have already had their first.
 *
 * Fresh module per test (isolateModules) over an in-memory AsyncStorage, so a
 * reload reads what the previous "launch" wrote.
 */

import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS, FIRST_TIME_EVENTS } from '@/constants/analytics';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const DAY_MS = 24 * 60 * 60 * 1000;

const mockMemoryStore = new Map<string, string>();
let mockFailReads = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => {
    if (mockFailReads) throw new Error('storage exploded');
    return mockMemoryStore.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    mockMemoryStore.set(key, value);
  },
}));

const mockInstall = { installedAt: new Date(), updatedAt: new Date() };

jest.mock('expo-application', () => ({
  getInstallationTimeAsync: async () => mockInstall.installedAt,
  getLastUpdateTimeAsync: async () => mockInstall.updatedAt,
}));

type InstallModule = typeof import('@/services/analyticsInstall');

/** A new launch: module state gone, storage kept. */
const launch = (): InstallModule => {
  let loaded: InstallModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/services/analyticsInstall') as InstallModule;
  });
  return loaded!;
};

describe('analyticsInstall', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    mockMemoryStore.clear();
    mockFailReads = false;
    Platform.OS = 'ios';
    mockInstall.installedAt = new Date(Date.now() - 60 * 1000);
    mockInstall.updatedAt = mockInstall.installedAt;
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  test('a new install claims First Open once, across launches', async () => {
    const first = launch();

    const record = await first.claimFirstOpen();
    expect(record).toEqual(expect.objectContaining({ installKind: 'new', firstOpenSent: true }));
    expect(await first.claimFirstOpen()).toBeNull();

    expect(await launch().claimFirstOpen()).toBeNull();
  });

  test('the install date is the day the app was installed, on the device calendar', async () => {
    mockInstall.installedAt = new Date(2026, 10, 3, 23, 30);

    const record = await launch().loadInstallRecord();

    expect(record?.installDate).toBe('2026-11-03');
  });

  test('each core action is first exactly once, and stays claimed after a relaunch', async () => {
    const first = launch();

    expect(await first.claimFirstTime(ANALYTICS_EVENTS.ARTICLE_VIEWED)).toBe(true);
    expect(await first.claimFirstTime(ANALYTICS_EVENTS.ARTICLE_VIEWED)).toBe(false);
    expect(await first.claimFirstTime(ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY)).toBe(true);

    // The write is fire-and-forget; let it land before the next launch reads.
    await new Promise(resolve => setImmediate(resolve));
    const second = launch();
    expect(await second.claimFirstTime(ANALYTICS_EVENTS.ARTICLE_VIEWED)).toBe(false);
    expect(await second.claimFirstTime(ANALYTICS_EVENTS.REVIEW_SESSION_STARTED)).toBe(true);
  });

  test('two claims racing for the same first: one wins', async () => {
    const install = launch();

    const results = await Promise.all([
      install.claimFirstTime(ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED),
      install.claimFirstTime(ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  // An existing user's first launch of this code: their first actions were
  // long ago, so none of them may be counted as first now.
  test('an install from long ago that has been updated is existing, with every first spent', async () => {
    Platform.OS = 'android';
    mockInstall.installedAt = new Date(Date.now() - 90 * DAY_MS);
    mockInstall.updatedAt = new Date(Date.now() - 2 * DAY_MS);
    const install = launch();

    expect(await install.claimFirstOpen()).toEqual(
      expect.objectContaining({ installKind: 'existing' }),
    );
    for (const event of FIRST_TIME_EVENTS) {
      expect(await install.claimFirstTime(event)).toBe(false);
    }
  });

  test('an Android install never updated is new, however late it is first opened', async () => {
    Platform.OS = 'android';
    mockInstall.installedAt = new Date(Date.now() - 3 * DAY_MS);
    mockInstall.updatedAt = mockInstall.installedAt;

    const record = await launch().claimFirstOpen();

    expect(record?.installKind).toBe('new');
  });

  test('iOS keeps no update time, so an old install reads as existing by its age alone', async () => {
    mockInstall.installedAt = new Date(Date.now() - 3 * DAY_MS);

    expect((await launch().loadInstallRecord())?.installKind).toBe('existing');
  });

  test('unreadable storage claims nothing, rather than sending a first twice', async () => {
    mockFailReads = true;
    const install = launch();

    expect(await install.claimFirstOpen()).toBeNull();
    expect(await install.claimFirstTime(ANALYTICS_EVENTS.ARTICLE_VIEWED)).toBe(false);
    expect(mockMemoryStore.has(STORAGE_KEYS.ANALYTICS_INSTALL)).toBe(false);
  });

  test('a stored record it cannot read is replaced, not trusted', async () => {
    mockMemoryStore.set(STORAGE_KEYS.ANALYTICS_INSTALL, '{"installDate":7}');

    const record = await launch().loadInstallRecord();

    expect(record).toEqual(expect.objectContaining({ installKind: 'new', firstOpenSent: false }));
    expect(JSON.parse(mockMemoryStore.get(STORAGE_KEYS.ANALYTICS_INSTALL) ?? '{}')).toEqual(
      expect.objectContaining({ installKind: 'new' }),
    );
  });
});
