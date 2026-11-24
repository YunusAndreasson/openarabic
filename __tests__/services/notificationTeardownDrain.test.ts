import { expect, jest, test } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  createScheduledNotificationMock,
  createPermissionsMock,
} from '@/__tests__/helpers/serviceMocks';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
let mockBridge: {
  beginPublication: () => boolean;
  endPublication: () => void;
  closePublications: () => Promise<void>;
};
jest.mock('@/services/widgets/native', () => ({
  get widgetBridge() {
    return mockBridge;
  },
}));
const prefs = { enabled: true, hour: 19, minute: 0 };
const pending = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const check = jest.mocked(Notifications.getPermissionsAsync);
test('teardown waits for a registration already accepted by another runtime before sweeping the host', async () => {
  Platform.OS = 'ios';
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const draining = Promise.withResolvers<void>();
  const drained = Promise.withResolvers<void>();
  let closing = false;
  const bridge = {
    beginPublication: () => !closing,
    endPublication: () => drained.resolve(),
    closePublications: () => {
      closing = true;
      draining.resolve();
      return drained.promise;
    },
  };
  mockBridge = bridge;
  function runtime() {
    let service!: typeof import('@/services/notificationService');
    jest.isolateModules(() => {
      jest.doMock('expo-notifications', () => Notifications);
      service = jest.requireActual('@/services/notificationService');
    });
    return service;
  }
  const headless = runtime();
  const foreground = runtime();
  const rows = new Map<string, Notifications.NotificationRequest>();
  pending.mockImplementation(async () => [...rows.values()]);
  jest.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValue([]);
  jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation(async id => {
    rows.delete(id);
  });
  check.mockResolvedValue(
    createPermissionsMock('granted', {
      iosStatus: Notifications.IosAuthorizationStatus.PROVISIONAL,
    }),
  );
  jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async input => {
    started.resolve();
    await release.promise;
    const id = input.identifier!;
    rows.set(id, createScheduledNotificationMock(id, input.content.data));
    return id;
  });
  const scheduling = headless.syncVerifiedReminderPlan(
    [
      createTestWord({
        fsrs_reps: 4,
        fsrs_stability: 0.1,
        fsrs_last_review: '2020-01-01T00:00:00Z',
        fsrs_due: '2020-01-02T00:00:00Z',
      }),
    ],
    prefs,
    'owner-a',
    'background',
    () => !closing,
  );
  await Promise.race([
    started.promise,
    scheduling.then(result => {
      throw new Error('Expected in-flight registration: ' + result.result);
    }),
  ]);
  let ended = false;
  const signOut = foreground.cancelAccountNotifications('owner-a').then(() => {
    ended = true;
  });
  await draining.promise;
  expect(ended).toBe(false);
  release.resolve();
  await Promise.all([signOut, scheduling]);
  expect(rows.size).toBe(0);
});
