import { afterEach, expect, jest, test } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import {
  createPermissionsMock,
  createScheduledNotificationMock,
} from '@/__tests__/helpers/serviceMocks';
import {
  syncReminderPlan,
  readReminderAccess,
  requestReviewReminder,
  syncVerifiedReminderPlan,
} from '@/services/notificationService';

const os = Platform.OS;
const version = Platform.Version;
afterEach(() => {
  Platform.OS = os;
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
});
const prefs = { enabled: true, hour: 19, minute: 0 };
const words = [createTestWord({ fsrs_state: 0 })];
const request = jest.mocked(Notifications.requestPermissionsAsync);
const check = jest.mocked(Notifications.getPermissionsAsync);
const pending = jest.mocked(Notifications.getAllScheduledNotificationsAsync);

test.each([
  Notifications.IosAuthorizationStatus.PROVISIONAL,
  Notifications.IosAuthorizationStatus.EPHEMERAL,
])('iOS authorization %s cannot verify', async status => {
  Platform.OS = 'ios';
  check.mockResolvedValue(createPermissionsMock('granted', { iosStatus: status }));
  expect((await readReminderAccess()).full).toBe(false);
  expect((await syncVerifiedReminderPlan(words, prefs, 'a', 'test')).result).toBe('restricted');
  expect(request).not.toHaveBeenCalled();
});
test('Android runtime grant with blocked or absent reminders channel cannot verify', async () => {
  Platform.OS = 'android';
  Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });
  check.mockResolvedValue(createPermissionsMock('granted'));
  jest.mocked(Notifications.getNotificationChannelAsync).mockResolvedValue(null);
  expect(await readReminderAccess()).toMatchObject({ full: true, channel: false });
  expect((await syncVerifiedReminderPlan(words, prefs, 'a', 'test')).result).toBe('restricted');
  expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});
test.each(['match', 'owner', 'revision', 'time', 'id', 'missing'] as const)(
  'enumerates actual matching iOS requests: %s',
  async change => {
    Platform.OS = 'ios';
    check.mockResolvedValue(
      createPermissionsMock('granted', {
        iosStatus: Notifications.IosAuthorizationStatus.AUTHORIZED,
      }),
    );
    const stored: Notifications.NotificationRequest[] = [];
    const unrelated = createScheduledNotificationMock('playlist');
    pending.mockImplementation(async () => [...stored, unrelated]);
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async input => {
      const trigger = input.trigger;
      if (
        trigger &&
        'type' in trigger &&
        trigger.type === Notifications.SchedulableTriggerInputTypes.CALENDAR &&
        !stored.length &&
        change !== 'missing'
      ) {
        const record = createScheduledNotificationMock(
          change === 'id' ? 'unrelated' : (input.identifier ?? ''),
          {
            ...input.content.data,
            ...(change === 'owner' && { reminderOwner: 'b' }),
            ...(change === 'revision' && { planRevision: 'old' }),
          },
        );
        Object.assign(record, {
          trigger: {
            type: 'calendar',
            repeats: false,
            dateComponents: {
              ...trigger,
              timeZone: 'GMT',
              minute: change === 'time' ? 17 : trigger.minute,
              isLeapMonth: false,
              isRepeatedDay: false,
            },
          },
        });
        stored.push(record);
      }
      return input.identifier ?? '';
    });
    const result = await syncVerifiedReminderPlan(words, prefs, 'a', 'test');
    expect(result.result).toBe(change === 'match' ? 'verified' : 'empty');
    expect(result.times).toHaveLength(change === 'match' ? 1 : 0);
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('playlist');
    expect(request).not.toHaveBeenCalled();
  },
);

test('only an explicit ask calls the system, then re-reads actual authorization', async () => {
  Platform.OS = 'ios';
  check
    .mockResolvedValueOnce(
      createPermissionsMock('undetermined', {
        iosStatus: Notifications.IosAuthorizationStatus.NOT_DETERMINED,
        canAskAgain: true,
      }),
    )
    .mockResolvedValue(
      createPermissionsMock('denied', {
        iosStatus: Notifications.IosAuthorizationStatus.DENIED,
        canAskAgain: false,
      }),
    );
  expect((await requestReviewReminder('attempt', 'first_completed_review')).full).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
  await requestReviewReminder('another', 'first_completed_review');
  expect(request).toHaveBeenCalledTimes(1);
});

test.each([
  'match',
  'stale',
  'wrong-channel',
  'registration-failed',
  'revoked',
  'blocked',
] as const)('Android 14 verifies the OS date and delivery channel (%s)', async change => {
  Platform.OS = 'android';
  Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });
  const records: Notifications.NotificationRequest[] = [];
  const grant = createPermissionsMock('granted');
  check.mockImplementation(async () =>
    change === 'revoked' && records.length ? createPermissionsMock('denied') : grant,
  );
  const channel = {
    id: 'reminders',
    name: 'Study Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  };
  jest.mocked(Notifications.getNotificationChannelAsync).mockImplementation(
    async () =>
      ({
        ...channel,
        importance:
          change === 'blocked' ? Notifications.AndroidImportance.NONE : channel.importance,
      }) as Notifications.NotificationChannel,
  );
  pending.mockImplementation(async () => records);
  jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async input => {
    const trigger = input.trigger;
    if (
      trigger &&
      'type' in trigger &&
      trigger.type === Notifications.SchedulableTriggerInputTypes.DATE
    ) {
      expect(trigger.channelId).toBe('reminders');
      const row = createScheduledNotificationMock(input.identifier ?? '', input.content.data);
      Object.assign(row, {
        trigger: {
          type: 'date',
          value: change === 'stale' ? 1 : +trigger.date,
          channelId: change === 'wrong-channel' ? 'default' : trigger.channelId,
        },
      });
      records.push(row);
      if (change === 'registration-failed') throw new Error('alarm rejected after persistence');
    }
    return input.identifier ?? '';
  });
  const result = await syncVerifiedReminderPlan(words, prefs, 'a', 'test');
  expect(result.result).toBe(
    change === 'match'
      ? 'verified'
      : change === 'revoked' || change === 'blocked'
        ? 'restricted'
        : 'empty',
  );
  expect(request).not.toHaveBeenCalled();
});

test('an enabled provisional iOS schedule survives an update without qualifying for activation', async () => {
  Platform.OS = 'ios';
  check.mockResolvedValue(
    createPermissionsMock('granted', {
      iosStatus: Notifications.IosAuthorizationStatus.PROVISIONAL,
    }),
  );
  pending.mockResolvedValue([]);
  await syncReminderPlan(words, { ...prefs, owner: 'a' }, 'data-change');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});
