import { afterEach, expect, jest, test } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import {
  createPermissionsMock,
  createScheduledNotificationMock,
} from '@/__tests__/helpers/serviceMocks';
import {
  cancelAccountNotifications,
  syncVerifiedReminderPlan,
} from '@/services/notificationService';

const os = Platform.OS;
const version = Platform.Version;
afterEach(() => {
  Platform.OS = os;
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
});
const prefs = { enabled: true, hour: 19, minute: 0 };

const request = jest.mocked(Notifications.requestPermissionsAsync);
const check = jest.mocked(Notifications.getPermissionsAsync);
const pending = jest.mocked(Notifications.getAllScheduledNotificationsAsync);

test.each([true, false])(
  'owner leaves during an in-flight plan; provisional=%p',
  async provisional => {
    Platform.OS = 'ios';
    check.mockResolvedValue(
      createPermissionsMock('granted', {
        iosStatus: provisional
          ? Notifications.IosAuthorizationStatus.PROVISIONAL
          : Notifications.IosAuthorizationStatus.AUTHORIZED,
      }),
    );
    const rows = new Map<string, Notifications.NotificationRequest>();
    pending.mockImplementation(async () => [...rows.values()]);
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation(async id => {
      rows.delete(id);
    });
    // Headless and foreground task managers have independent JS queues and share OS requests.
    let cancelOnSignout!: () => Promise<void>;
    jest.isolateModules(() => {
      jest.doMock('expo-notifications', () => Notifications);
      cancelOnSignout = require('@/services/notificationService').cancelSmartNotifications;
    });
    let current = true;
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async input => {
      if (current) {
        current = false;
        rows.set('srs-old', createScheduledNotificationMock('srs-old'));
        await cancelOnSignout();
      }
      const id = input.identifier!;
      rows.set(id, {
        ...createScheduledNotificationMock(id),
        content: {
          ...createScheduledNotificationMock(id).content,
          ...input.content,
        } as Notifications.NotificationContent,
      });
      return id;
    });
    const word = createTestWord({
      fsrs_state: 2,
      fsrs_reps: 4,
      fsrs_stability: 0.1,
      fsrs_last_review: '2020-01-01T00:00:00Z',
      fsrs_due: '2020-01-02T00:00:00Z',
      root: { id: 1, audio_url: '', audio_url_en: '', letters: 'كَتَبَ', meaning: 'wrote' },
    });
    const observed = await syncVerifiedReminderPlan(
      [word],
      prefs,
      'owner-a',
      'background',
      () => current,
    );
    expect(rows.has('srs-old')).toBe(false);
    expect(observed.result).toBe('empty');
    expect(request).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect(rows.size).toBe(0);
  },
);

test('teardown removes quiet and legacy reminders from the tray and schedule, scoped to the departing account', async () => {
  const rows = [
    createScheduledNotificationMock('srs-quiet', { reminderOwner: 'learner' }),
    createScheduledNotificationMock('legacy', { type: 'study-reminder' }),
    createScheduledNotificationMock('srs-other', { reminderOwner: 'different' }),
    createScheduledNotificationMock('other'),
  ];
  pending.mockResolvedValue(rows);
  jest
    .mocked(Notifications.getPresentedNotificationsAsync)
    .mockResolvedValue(rows.map(r => ({ date: 0, request: r })));
  await cancelAccountNotifications('learner');
  for (const cancel of [
    Notifications.cancelScheduledNotificationAsync,
    Notifications.dismissNotificationAsync,
  ]) {
    expect(jest.mocked(cancel).mock.calls.map(([id]) => id)).toEqual(['srs-quiet', 'legacy']);
  }
});
