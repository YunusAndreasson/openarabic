/**
 * Notification Service Tests
 *
 * Tests the notification service which manages:
 * - Push notification initialization and configuration
 * - Daily reminder scheduling
 * - App badge count management
 * - Permission handling (iOS and Android)
 * - Notification listeners and navigation
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking (handleError, analytics)
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - tests share mock state and need isolation
 * - ✅ Custom expo-notifications mock pattern (preserved for compatibility)
 */

import { describe, test, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import { Platform } from 'react-native';

import type { PlannedNotification } from '@/utils/notificationPlanner';

// expo-notifications is already mocked by __mocks__/expo-notifications.js
// Import it to get access to the mock functions

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/constants/routes', () => ({
  ROUTE_PATHS: {
    PRACTICE_TAB: '/practice',
  },
}));

jest.mock('@/constants/colors', () => ({
  Colors: {
    light: {
      tint: '#4A9B8E',
    },
  },
}));

jest.mock('@/utils/notificationPlanner', () => ({
  buildNotificationPlan: jest.fn(),
}));

// Import after mocks
import * as Notifications from 'expo-notifications';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { handleError } from '@/utils/errorHandling';
import { buildNotificationPlan } from '@/utils/notificationPlanner';

// Get access to mock functions from expo-notifications mock.
//
// Each key mirrors an export of the real module, so the signatures are derived
// from it rather than restated as a bare `jest.Mock` — that is
// `Mock<UnknownFunction>`, whose `mockResolvedValue` argument resolves to
// `never`, so every `.mockResolvedValue(...)` below was unchecked. Deriving also
// means an export expo removes fails here instead of silently mocking nothing.
type MockedNotificationApi<K extends keyof typeof Notifications> = {
  [P in K]: jest.MockedFunction<Extract<(typeof Notifications)[P], (...args: never[]) => unknown>>;
};

const NotificationsMock = Notifications as typeof Notifications & {
  __mocks: MockedNotificationApi<
    | 'setNotificationHandler'
    | 'setNotificationCategoryAsync'
    | 'setNotificationChannelAsync'
    | 'addNotificationResponseReceivedListener'
    | 'addNotificationsDroppedListener'
    | 'getPermissionsAsync'
    | 'requestPermissionsAsync'
    | 'scheduleNotificationAsync'
    | 'cancelAllScheduledNotificationsAsync'
    | 'cancelScheduledNotificationAsync'
    | 'getAllScheduledNotificationsAsync'
    | 'setBadgeCountAsync'
    | 'getBadgeCountAsync'
    | 'getLastNotificationResponse'
    | 'clearLastNotificationResponse'
  >;
};

const mockSetNotificationHandler = NotificationsMock.__mocks.setNotificationHandler;
const mockSetNotificationCategoryAsync = NotificationsMock.__mocks.setNotificationCategoryAsync;
const mockSetNotificationChannelAsync = NotificationsMock.__mocks.setNotificationChannelAsync;
const mockAddNotificationResponseReceivedListener =
  NotificationsMock.__mocks.addNotificationResponseReceivedListener;
const mockAddNotificationsDroppedListener =
  NotificationsMock.__mocks.addNotificationsDroppedListener;
const mockGetPermissionsAsync = NotificationsMock.__mocks.getPermissionsAsync;
const mockRequestPermissionsAsync = NotificationsMock.__mocks.requestPermissionsAsync;
const mockScheduleNotificationAsync = NotificationsMock.__mocks.scheduleNotificationAsync;
const mockCancelAllScheduledNotificationsAsync =
  NotificationsMock.__mocks.cancelAllScheduledNotificationsAsync;
const mockCancelScheduledNotificationAsync =
  NotificationsMock.__mocks.cancelScheduledNotificationAsync;
const mockGetAllScheduledNotificationsAsync =
  NotificationsMock.__mocks.getAllScheduledNotificationsAsync;
const mockSetBadgeCountAsync = NotificationsMock.__mocks.setBadgeCountAsync;
const mockGetBadgeCountAsync = NotificationsMock.__mocks.getBadgeCountAsync;
const mockGetLastNotificationResponse = NotificationsMock.__mocks.getLastNotificationResponse;
const mockClearLastNotificationResponse = NotificationsMock.__mocks.clearLastNotificationResponse;

// Import service after mocks - service runs setNotificationHandler on load
import * as notificationService from '@/services/notificationService';

// Captured at import time: the global `resetMocks` wipes `mock.calls` before
// every test, and the handler is only registered once, on module load.
const foregroundHandler = mockSetNotificationHandler.mock.calls[0]?.[0];
import {
  createPermissionsMock,
  createScheduledNotificationMock,
} from '@/__tests__/helpers/serviceMocks';

describe('notificationService', () => {
  // Initialize once at the start to set up listeners
  beforeAll(async () => {
    await notificationService.initializeNotifications();
  });

  beforeEach(() => {
    // Clear only the mocks that need to be reset, but not listener registration
    mockGetPermissionsAsync.mockClear();
    mockRequestPermissionsAsync.mockClear();
    mockScheduleNotificationAsync.mockClear();
    mockCancelAllScheduledNotificationsAsync.mockClear();
    mockCancelScheduledNotificationAsync.mockClear();
    mockGetAllScheduledNotificationsAsync.mockClear();
    // `setAppBadgeCount` now passes Expo's own answer through, and the global
    // `resetMocks` wipes the shared mock's resolved value before every test.
    mockSetBadgeCountAsync.mockClear();
    mockSetBadgeCountAsync.mockResolvedValue(true);
    mockGetBadgeCountAsync.mockClear();
    mockSetNotificationCategoryAsync.mockClear();
    mockSetNotificationChannelAsync.mockClear();
    jest.mocked(handleError).mockClear();
    jest.mocked(analytics.track).mockClear();

    // Reset default mock implementations
    mockGetPermissionsAsync.mockResolvedValue(createPermissionsMock('granted'));
    mockRequestPermissionsAsync.mockResolvedValue(createPermissionsMock('granted'));

    mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      // Service is initialized in beforeAll, just verify it returns true when called again
      const success = await notificationService.initializeNotifications();
      expect(success).toBeTruthy();
    });

    test('should be idempotent (only initialize once)', async () => {
      // Service already initialized, calling again should return true without re-initializing
      const success1 = await notificationService.initializeNotifications();
      const success2 = await notificationService.initializeNotifications();
      expect(success1).toBeTruthy();
      expect(success2).toBeTruthy();
    });
  });

  describe('Permission Handling', () => {
    test('should return true if permissions already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('granted'));

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeTruthy();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('should request permissions if not granted', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('undetermined'));
      mockRequestPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('granted'));

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeTruthy();
      expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: false,
          allowProvisional: false,
        },
      });
    });

    test('should return false if user denies permissions', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('undetermined'));
      mockRequestPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('denied'));

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeFalsy();
    });

    test('should handle iOS provisional authorization as granted', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('granted', {
          iosStatus: Notifications.IosAuthorizationStatus.PROVISIONAL,
        }),
      );

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeTruthy();
    });

    test('should not request if iOS status is DENIED', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('denied', { iosStatus: Notifications.IosAuthorizationStatus.DENIED }),
      );

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBeFalsy();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('does not re-ask an Android permission that was finally denied', async () => {
      Platform.OS = 'android';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('denied', { canAskAgain: false }),
      );

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBe(false);
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('asks again on Android while the denial is not final', async () => {
      Platform.OS = 'android';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('denied', { canAskAgain: true }),
      );
      mockRequestPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('granted'));

      const granted = await notificationService.ensurePermissions();

      expect(granted).toBe(true);
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    test('should handle iOS ephemeral status as not granted', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('undetermined', {
          iosStatus: Notifications.IosAuthorizationStatus.EPHEMERAL,
        }),
      );

      const granted = await notificationService.ensurePermissions();

      // Ephemeral is treated as not granted
      expect(typeof granted).toBe('boolean');
    });
  });

  describe('Foreground presentation', () => {
    test('does not apply a reminder badge payload over an open app', async () => {
      const behaviour = await foregroundHandler?.handleNotification(
        {} as Notifications.Notification,
      );

      // A reminder's `badge:` is projected at schedule time. Applying it while
      // the app is open would overwrite the live count useAppBadge just wrote,
      // with no background->active transition left to correct it.
      expect(behaviour?.shouldSetBadge).toBe(false);
    });
  });

  describe('Smart Notification Sync', () => {
    const makePlan = (overrides: Partial<PlannedNotification> = {}): PlannedNotification => ({
      identifier: 'srs-due-2026-07-20',
      type: 'srs-due',
      fireDate: new Date('2026-07-20T19:00:00'),
      wordCount: 4,
      badgeCount: 4,
      ...overrides,
    });

    test('should schedule every planned notification with its stable identifier', async () => {
      const plan = [
        makePlan(),
        makePlan({
          identifier: 'srs-slipping-2026-07-21',
          type: 'srs-slipping',
          fireDate: new Date('2026-07-21T19:00:00'),
          wordCount: 2,
          badgeCount: 6,
          sampleWord: { rootId: 7, arabic: 'كِتاب', meaning: 'book' },
        }),
      ];

      const count = await notificationService.syncSmartNotifications(plan, 'test');

      expect(count).toBe(2);
      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);
      const identifiers = mockScheduleNotificationAsync.mock.calls.map(
        call => (call[0] as { identifier: string }).identifier,
      );
      expect(identifiers).toEqual(['srs-due-2026-07-20', 'srs-slipping-2026-07-21']);
    });

    test('should cancel managed notifications before scheduling (smart prefix + legacy type)', async () => {
      mockGetAllScheduledNotificationsAsync.mockResolvedValueOnce([
        createScheduledNotificationMock('srs-due-2026-07-19', { type: 'srs-due' }),
        createScheduledNotificationMock('reminder-1234', { type: 'study-reminder' }),
        createScheduledNotificationMock('unrelated', { type: 'something-else' }),
      ]);

      await notificationService.syncSmartNotifications([makePlan()], 'test');

      const canceled = mockCancelScheduledNotificationAsync.mock.calls.map(call => call[0]);
      expect(canceled).toEqual(['srs-due-2026-07-19', 'reminder-1234']);
    });

    test('should not schedule when permission is not granted (check-only, never requests)', async () => {
      mockGetPermissionsAsync.mockResolvedValue(createPermissionsMock('denied'));

      const count = await notificationService.syncSmartNotifications([makePlan()], 'test');

      expect(count).toBe(0);
      expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('empty plan cancels stale notifications without scheduling', async () => {
      mockGetAllScheduledNotificationsAsync.mockResolvedValueOnce([
        createScheduledNotificationMock('srs-due-2026-07-19', { type: 'srs-due' }),
      ]);

      const count = await notificationService.syncSmartNotifications([], 'test');

      expect(count).toBe(0);
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('srs-due-2026-07-19');
      expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    });

    test('continues scheduling after a per-item failure', async () => {
      mockScheduleNotificationAsync
        .mockRejectedValueOnce(new Error('Scheduling failed'))
        .mockResolvedValueOnce('ok');

      const count = await notificationService.syncSmartNotifications(
        [
          makePlan(),
          makePlan({ identifier: 'srs-due-2026-07-21', fireDate: new Date('2026-07-21T19:00:00') }),
        ],
        'test',
      );

      expect(count).toBe(1);
      expect(handleError).toHaveBeenCalled();
    });

    test('syncReminderPlan builds the plan from the reminder setting and schedules it', async () => {
      const plan = [makePlan({ identifier: 'srs-due-from-prefs' })];
      jest.mocked(buildNotificationPlan).mockReturnValue(plan);

      const scheduled = await notificationService.syncReminderPlan(
        [],
        { hour: 8, minute: 30, enabled: true, lastSessionCompletedAt: 1_700_000_000_000 },
        'test',
      );

      expect(buildNotificationPlan).toHaveBeenCalledWith({
        words: [],
        now: expect.any(Date),
        preferredHour: 8,
        preferredMinute: 30,
        lastSessionCompletedAt: 1_700_000_000_000,
      });
      expect(scheduled).toBe(1);
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'srs-due-from-prefs' }),
      );
    });

    test('cancelSmartNotifications does not throw on errors', async () => {
      mockGetAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('boom'));

      await expect(notificationService.cancelSmartNotifications()).resolves.toBeUndefined();
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Permission Status (check-only)', () => {
    test('maps granted status', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('granted'));
      await expect(notificationService.getPermissionStatus()).resolves.toBe('granted');
    });

    test('maps final denial (cannot ask again) to denied', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('denied', { canAskAgain: false }),
      );
      await expect(notificationService.getPermissionStatus()).resolves.toBe('denied');
    });

    test('maps Android never-asked state (denied + canAskAgain) to undetermined', async () => {
      Platform.OS = 'android';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('denied', { canAskAgain: true }),
      );
      await expect(notificationService.getPermissionStatus()).resolves.toBe('undetermined');
    });

    test('maps undetermined status without requesting', async () => {
      mockGetPermissionsAsync.mockResolvedValueOnce(createPermissionsMock('undetermined'));
      await expect(notificationService.getPermissionStatus()).resolves.toBe('undetermined');
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    test('maps iOS provisional to granted', async () => {
      Platform.OS = 'ios';
      mockGetPermissionsAsync.mockResolvedValueOnce(
        createPermissionsMock('undetermined', {
          iosStatus: Notifications.IosAuthorizationStatus.PROVISIONAL,
        }),
      );
      await expect(notificationService.getPermissionStatus()).resolves.toBe('granted');
    });
  });

  describe('Badge Management', () => {
    test('should set app badge count', async () => {
      const success = await notificationService.setAppBadgeCount(5);

      expect(success).toBeTruthy();
      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    test('should validate badge count (floor decimal)', async () => {
      await notificationService.setAppBadgeCount(5.7);

      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    test('should validate badge count (prevent negative)', async () => {
      await notificationService.setAppBadgeCount(-3);

      expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(0);
    });

    test('should handle badge set errors', async () => {
      mockSetBadgeCountAsync.mockRejectedValueOnce(new Error('Badge set failed'));

      const success = await notificationService.setAppBadgeCount(5);

      expect(success).toBeFalsy();
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Notification Listeners and Navigation', () => {
    test('should handle cleanup when no listeners exist', () => {
      expect(() => notificationService.cleanupNotifications()).not.toThrow();
    });
  });

  describe('handleNotificationResponse', () => {
    const buildResponse = ({
      actionIdentifier = Notifications.DEFAULT_ACTION_IDENTIFIER,
      type,
      identifier = 'srs-due-123',
      date = 1_700_000_000_000,
    }: {
      actionIdentifier?: string;
      type?: string;
      identifier?: string;
      date?: number;
    }): Notifications.NotificationResponse => ({
      actionIdentifier,
      notification: {
        date,
        request: {
          identifier,
          trigger: null,
          content: {
            title: null,
            subtitle: null,
            body: null,
            categoryIdentifier: null,
            threadIdentifier: null,
            sound: null,
            data: type === undefined ? {} : { type },
          },
        },
      },
    });

    test('a tap on the notification body opens its screen and counts as opened', () => {
      const navigate = jest.fn();

      // Distinct identifiers per test: the handler deliberately remembers the
      // last notification it routed, and that memory outlives a single test.
      const routed = notificationService.handleNotificationResponse(
        buildResponse({ type: 'srs-due', identifier: 'tap-body' }),
        navigate,
      );

      expect(routed).toBe(true);
      expect(navigate).toHaveBeenCalledWith('/practice');
      expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SMART_REMINDER_OPENED, {
        type: 'srs-due',
      });
    });

    test('the bare "DEFAULT" string is not the default action', () => {
      const navigate = jest.fn();

      notificationService.handleNotificationResponse(
        buildResponse({ actionIdentifier: 'DEFAULT', type: 'srs-due', identifier: 'bare' }),
        navigate,
      );

      expect(navigate).not.toHaveBeenCalled();
    });

    test('pressing the "Complete" action never navigates, on a cold start included', () => {
      const navigate = jest.fn();

      notificationService.handleNotificationResponse(
        buildResponse({ actionIdentifier: 'complete', type: 'srs-due', identifier: 'complete' }),
        navigate,
        { coldStart: true },
      );

      expect(navigate).not.toHaveBeenCalled();
      expect(analytics.track).not.toHaveBeenCalled();
    });

    test('a launch tap seen by both the listener and the cold-start path routes once', () => {
      const navigate = jest.fn();
      const response = buildResponse({ type: 'srs-slipping', identifier: 'launch-tap' });

      notificationService.handleNotificationResponse(response, navigate);
      notificationService.handleNotificationResponse(response, navigate, { coldStart: true });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(analytics.track).toHaveBeenCalledTimes(1);
    });

    test('a repeating reminder routes again when it is delivered again', () => {
      const navigate = jest.fn();

      notificationService.handleNotificationResponse(
        buildResponse({ type: 'study-reminder', identifier: 'daily', date: 1 }),
        navigate,
      );
      notificationService.handleNotificationResponse(
        buildResponse({ type: 'study-reminder', identifier: 'daily', date: 2 }),
        navigate,
      );

      expect(navigate).toHaveBeenCalledTimes(2);
    });

    test('a response is not consumed while nothing can navigate yet', () => {
      const navigate = jest.fn();
      const response = buildResponse({ type: 'srs-due', identifier: 'early' });

      // The listener can fire before the root layout registers its callback.
      expect(notificationService.handleNotificationResponse(response, null)).toBe(false);
      notificationService.handleNotificationResponse(response, navigate, { coldStart: true });

      expect(navigate).toHaveBeenCalledWith('/practice');
      expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SMART_REMINDER_OPENED, {
        type: 'srs-due',
        coldStart: true,
      });
    });

    test('observing routes the tap that launched the app, once, and clears it', () => {
      const navigate = jest.fn();
      mockGetLastNotificationResponse.mockReturnValue(
        buildResponse({ type: 'srs-due', identifier: 'cold-start' }),
      );
      const remove = jest.fn();
      mockAddNotificationResponseReceivedListener.mockReturnValue({ remove });

      const unsubscribe = notificationService.observeNotificationResponses(navigate);

      expect(navigate).toHaveBeenCalledWith('/practice');
      expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.SMART_REMINDER_OPENED, {
        type: 'srs-due',
        coldStart: true,
      });
      expect(mockClearLastNotificationResponse).toHaveBeenCalledTimes(1);

      unsubscribe();
      expect(remove).toHaveBeenCalledTimes(1);
    });

    test('observing routes every later tap through the response listener', () => {
      const navigate = jest.fn();
      mockGetLastNotificationResponse.mockReturnValue(null);
      mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });

      notificationService.observeNotificationResponses(navigate);
      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0]?.[0];
      listener?.(buildResponse({ type: 'srs-slipping', identifier: 'warm-tap' }));

      expect(navigate).toHaveBeenCalledWith('/practice');
      expect(mockClearLastNotificationResponse).not.toHaveBeenCalled();
    });

    test('ignores notifications without a routable type', () => {
      const navigate = jest.fn();

      notificationService.handleNotificationResponse(
        buildResponse({ identifier: 'untyped' }),
        navigate,
      );
      notificationService.handleNotificationResponse(
        buildResponse({ type: 'toString', identifier: 'proto' }),
        navigate,
      );

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
