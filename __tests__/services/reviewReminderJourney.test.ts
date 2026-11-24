import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, accountOwnedStorageKeys } from '@/constants/storageKeys';
import { beforeEach, expect, jest, test } from '@jest/globals';
import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { ANALYTICS_EVENTS as EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import {
  enterReminderSession,
  finishIdleReminderSession,
  backgroundReminderSession,
  currentReminderSession,
  claimReminderOffer,
  claimReminderRecovery,
  reminderAction,
  recordReminderObservation,
} from '@/services/reviewReminderJourney';

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn(), registerSuperProperties: jest.fn() },
}));
jest.mock('@/services/analyticsInstall', () => ({
  loadInstallRecord: async () => ({ installKind: 'new', firstOpenSent: false }),
}));

const start = +new Date(2026, 10, 23, 12);
const hour = 3600000;
const visible = () => true;
const grant = { full: true, channel: true, raw: '2', canAskAgain: false };
const metric = () =>
  jest
    .mocked(analytics.track)
    .mock.calls.filter(([name]) => name === EVENTS.FIRST_SESSION_REVIEW_AND_REMINDER);
async function first() {
  jest.setSystemTime(start);
  await enterReminderSession(true, Date.now(), 'a');
  await claimReminderOffer('a', 'review', currentReminderSession(), start, visible);
  await reminderAction('a', 'request');
}
beforeEach(mockReviewStorage);

test('settings handoff stays in session one; a verified snapshot qualifies once at the boundary', async () => {
  await first();
  const original = currentReminderSession();
  await backgroundReminderSession(start + 100);
  await enterReminderSession(false, start + 400, 'a');
  expect(currentReminderSession()).toBe(original);
  await recordReminderObservation('a', {
    access: grant,
    revision: 'r',
    times: [start + hour],
    result: 'verified',
    enabled: true,
  });
  expect(metric()).toHaveLength(0);
  await backgroundReminderSession(start + 1000);
  await enterReminderSession(false, start + hour, 'a');
  await enterReminderSession(true, start + 2 * hour, 'a');
  expect(metric()).toHaveLength(1);
  expect(metric()[0]?.[1]).toMatchObject({
    review_session_id: 'review',
    managed_future_count: 1,
    foreground_session_number: 1,
    full_permission: true,
  });
});

test.each(['restricted', 'empty', 'error', 'disabled'] as const)(
  'latest %s observation withdraws qualification',
  async result => {
    await first();
    await recordReminderObservation('a', {
      access: grant,
      revision: 'r',
      times: [start + hour],
      result: 'verified',
      enabled: true,
    });
    await recordReminderObservation('a', {
      access: grant,
      revision: 'r',
      times: [],
      result,
      enabled: false,
    });
    await enterReminderSession(true, start + hour, 'a');
    expect(metric()).toHaveLength(0);
  },
);

test('a different owner, hidden tab, same day and same session cannot spend the recovery', async () => {
  await first();
  await recordReminderObservation('a', {
    access: { ...grant, full: false },
    revision: 'r',
    times: [],
    result: 'restricted',
    enabled: false,
  });
  expect(await claimReminderRecovery('a', visible)).toBeNull();
  await enterReminderSession(true, Date.now(), 'a');
  expect(await claimReminderRecovery('a', visible)).toBeNull();
  jest.setSystemTime(start + 24 * hour);
  expect(await claimReminderRecovery('b', visible)).toBeNull();
  expect(await claimReminderRecovery('a', () => false)).toBeNull();
  const claims = await Promise.all([
    claimReminderRecovery('a', visible),
    claimReminderRecovery('a', visible),
  ]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  await enterReminderSession(true, Date.now(), 'a');
  expect(await claimReminderRecovery('a', visible)).toBeNull();
});

test('expiration, sign-out and a grade from an earlier session cannot qualify', async () => {
  await first();
  await recordReminderObservation('a', {
    access: grant,
    enabled: true,
    revision: 'r',
    times: [start + hour],
    result: 'verified',
  });
  await backgroundReminderSession(start + hour);
  await enterReminderSession(true, start + 2 * hour, 'a');
  await recordReminderObservation('a', {
    access: grant,
    enabled: true,
    revision: 'new',
    times: [start + 5 * hour],
    result: 'verified',
  });
  await recordReminderObservation(undefined);
  await enterReminderSession(true, start + 3 * hour, 'a');
  expect(metric()).toHaveLength(0);
});

test('a suspended session is settled once before a later headless cancellation', async () => {
  await first();
  await recordReminderObservation('a', {
    access: grant,
    enabled: true,
    revision: 'r',
    times: [start + 2 * hour],
    result: 'verified',
  });
  await backgroundReminderSession(start);
  jest.setSystemTime(start + hour);
  await recordReminderObservation(undefined);
  await finishIdleReminderSession(Date.now(), 'a');
  await enterReminderSession(true, Date.now(), 'a');
  expect(metric()).toHaveLength(1);
});

test('deletion leaves an anonymous install ledger only', async () => {
  await first();
  const install = await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_REMINDER_JOURNEY);
  expect(JSON.parse(install!)).not.toHaveProperty('offer');
  expect(JSON.parse(install!)).not.toHaveProperty('firstReviewId');
  for (const key of accountOwnedStorageKeys('a')) await AsyncStorage.removeItem(key);
  expect(await claimReminderRecovery('a', visible)).toBeNull();
});
