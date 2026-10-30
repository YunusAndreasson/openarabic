/**
 * The stored privacy choice. Default is deny: every way of not knowing what the
 * person decided has to read as no consent, and a relaunch has to read back
 * exactly what was decided.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { CONSENT_VERSION } from '@/services/consent';

const mockStorage = new Map<string, string>();
const mockReads = { count: 0, fail: false, failWrites: false };

// Plain functions: resetMocks would empty a jest.fn, and the repo-wide mock
// reads back nothing.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => {
    mockReads.count += 1;
    if (mockReads.fail) throw new Error('storage unavailable');
    return mockStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (mockReads.failWrites) throw new Error('storage full');
    mockStorage.set(key, value);
  },
}));

type ConsentModule = typeof import('@/services/consent');

/** A fresh copy of the module, which is what a relaunch is to its memory. */
const relaunch = (): ConsentModule => {
  let loaded: ConsentModule | undefined;
  jest.isolateModules(() => {
    loaded = require('@/services/consent');
  });
  return loaded!;
};

const stored = (value: unknown) =>
  mockStorage.set(STORAGE_KEYS.PRIVACY_CONSENT, JSON.stringify(value));

const expectNoConsent = async (consent: ConsentModule) => {
  expect(await consent.loadConsent()).toBeNull();
  expect(consent.getConsent()).toBeNull();
  expect(consent.getConsentState()).toEqual({ isLoaded: true, consent: null });
  expect(consent.isAllowed('analytics')).toBe(false);
  expect(consent.isAllowed('measurement')).toBe(false);
};

beforeEach(() => {
  mockStorage.clear();
  mockReads.count = 0;
  mockReads.fail = false;
  mockReads.failWrites = false;
});

describe('no decision', () => {
  test('nothing stored counts as none, and nothing is allowed', async () => {
    await expectNoConsent(relaunch());
  });

  test('nothing is allowed before the first read has landed', () => {
    const consent = relaunch();

    expect(consent.getConsent()).toBeNull();
    expect(consent.getConsentState().isLoaded).toBe(false);
    expect(consent.isAllowed('analytics')).toBe(false);
    expect(consent.isAllowed('measurement')).toBe(false);
  });

  test('a failed read counts as none', async () => {
    mockReads.fail = true;
    await expectNoConsent(relaunch());
  });

  test('a blob that does not parse counts as none', async () => {
    mockStorage.set(STORAGE_KEYS.PRIVACY_CONSENT, '{"analytics":tr');
    await expectNoConsent(relaunch());
  });

  test.each([
    ['null', null],
    ['a string', 'yes'],
    ['an array', [true, true]],
    ['an empty object', {}],
    ['a missing field', { analytics: true, measurement: true, version: 1 }],
    [
      'a stringly-typed choice',
      { analytics: 'true', measurement: true, version: 1, decidedAt: '2026-01-01T00:00:00.000Z' },
    ],
    [
      'a stringly-typed version',
      { analytics: true, measurement: true, version: '1', decidedAt: '2026-01-01T00:00:00.000Z' },
    ],
  ])('%s counts as none', async (_label, value) => {
    stored(value);
    await expectNoConsent(relaunch());
  });

  test('a choice under another version counts as none, so new wording asks again', async () => {
    stored({
      analytics: true,
      measurement: true,
      version: CONSENT_VERSION + 1,
      decidedAt: '2026-01-01T00:00:00.000Z',
    });
    await expectNoConsent(relaunch());

    stored({
      analytics: true,
      measurement: true,
      version: CONSENT_VERSION - 1,
      decidedAt: '2026-01-01T00:00:00.000Z',
    });
    await expectNoConsent(relaunch());
  });
});

describe('an earlier grant that no longer counts', () => {
  const decidedAt = '2026-01-01T00:00:00.000Z';

  test('nothing stored means none, so no Meta call is ever needed for it', async () => {
    const consent = relaunch();

    await consent.loadConsent();

    expect(consent.mayHaveEarlierMeasurementGrant()).toBe(false);
  });

  test('an older version that allowed measurement is flagged', async () => {
    const consent = relaunch();
    stored({
      analytics: false,
      measurement: true,
      version: CONSENT_VERSION - 1,
      decidedAt,
    });

    await consent.loadConsent();

    expect(consent.isAllowed('measurement')).toBe(false);
    expect(consent.mayHaveEarlierMeasurementGrant()).toBe(true);
  });

  test('an older version that refused measurement is not', async () => {
    const consent = relaunch();
    stored({
      analytics: true,
      measurement: false,
      version: CONSENT_VERSION - 1,
      decidedAt,
    });

    await consent.loadConsent();

    expect(consent.mayHaveEarlierMeasurementGrant()).toBe(false);
  });

  test('a blob that cannot be read might have said anything, so it is flagged', async () => {
    mockStorage.set(STORAGE_KEYS.PRIVACY_CONSENT, 'garbage');
    const consent = relaunch();

    await consent.loadConsent();

    expect(consent.mayHaveEarlierMeasurementGrant()).toBe(true);
  });

  test('a new decision settles it', async () => {
    const consent = relaunch();
    stored({
      analytics: false,
      measurement: true,
      version: CONSENT_VERSION - 1,
      decidedAt,
    });
    await consent.loadConsent();

    await consent.saveConsent({ analytics: false, measurement: false });

    expect(consent.mayHaveEarlierMeasurementGrant()).toBe(false);
  });
});

describe('a decision', () => {
  test('is stored in the shape it is read back from, under the current version', async () => {
    const consent = relaunch();
    jest.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));

    await consent.saveConsent({ analytics: true, measurement: false });

    expect(JSON.parse(mockStorage.get(STORAGE_KEYS.PRIVACY_CONSENT)!)).toEqual({
      analytics: true,
      measurement: false,
      version: CONSENT_VERSION,
      decidedAt: '2026-10-30T12:00:00.000Z',
    });
  });

  test('survives a relaunch', async () => {
    await relaunch().saveConsent({ analytics: true, measurement: false });

    const consent = relaunch();
    const loaded = await consent.loadConsent();

    expect(loaded).toMatchObject({ analytics: true, measurement: false });
    expect(consent.getConsent()).toEqual(loaded);
  });

  test('the two choices are independent', async () => {
    const consent = relaunch();

    await consent.saveConsent({ analytics: true, measurement: false });
    expect(consent.isAllowed('analytics')).toBe(true);
    expect(consent.isAllowed('measurement')).toBe(false);

    await consent.saveConsent({ analytics: false, measurement: true });
    expect(consent.isAllowed('analytics')).toBe(false);
    expect(consent.isAllowed('measurement')).toBe(true);
  });

  test('is in force at once, without waiting for the write', async () => {
    const consent = relaunch();
    await consent.loadConsent();

    const saving = consent.saveConsent({ analytics: true, measurement: true });
    // One tick for the load inside it, none for the write.
    await Promise.resolve();
    await Promise.resolve();

    expect(consent.isAllowed('analytics')).toBe(true);
    await saving;
  });

  test('a failed write holds for this launch and asks again on the next', async () => {
    mockReads.failWrites = true;
    const consent = relaunch();

    await consent.saveConsent({ analytics: true, measurement: true });
    expect(consent.isAllowed('analytics')).toBe(true);

    await expectNoConsent(relaunch());
  });

  test('loadConsent resolves the latest decision, not the first read', async () => {
    const consent = relaunch();
    await consent.loadConsent();

    await consent.saveConsent({ analytics: true, measurement: false });

    expect(await consent.loadConsent()).toMatchObject({ analytics: true, measurement: false });
  });
});

describe('loadConsent', () => {
  test('reads storage once, however many calls arrive first', async () => {
    const consent = relaunch();

    await Promise.all([consent.loadConsent(), consent.loadConsent(), consent.loadConsent()]);
    await consent.loadConsent();

    expect(mockReads.count).toBe(1);
  });
});

describe('subscribeConsent', () => {
  test('tells listeners when the choice loads and when it changes', async () => {
    const consent = relaunch();
    const listener = jest.fn();
    const unsubscribe = consent.subscribeConsent(listener);

    await consent.loadConsent();
    expect(listener).toHaveBeenCalledTimes(1);

    await consent.saveConsent({ analytics: true, measurement: true });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await consent.saveConsent({ analytics: false, measurement: false });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('the snapshot only changes when the choice does', async () => {
    const consent = relaunch();
    await consent.loadConsent();

    expect(consent.getConsentState()).toBe(consent.getConsentState());
  });
});
