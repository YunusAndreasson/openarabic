// Mock expo-notifications for testing
// This provides a basic mock that can be overridden in individual tests

const mockSubscription = { remove: jest.fn() };

const mockSetNotificationHandler = jest.fn();
const mockSetNotificationCategoryAsync = mockStable(() => Promise.resolve(undefined));
const mockSetNotificationChannelAsync = mockStable(() => Promise.resolve(undefined));
const mockAddNotificationReceivedListener = mockStable(() => mockSubscription);
const mockAddNotificationResponseReceivedListener = mockStable(() => mockSubscription);
const mockAddNotificationsDroppedListener = mockStable(() => mockSubscription);
const mockGetPermissionsAsync = mockStable(() => Promise.resolve({ status: 'granted' }));
const mockRequestPermissionsAsync = mockStable(() => Promise.resolve({ status: 'granted' }));
const mockScheduleNotificationAsync = mockStable(() => Promise.resolve('notification-id'));
const mockCancelAllScheduledNotificationsAsync = mockStable(() => Promise.resolve(undefined));
const mockCancelScheduledNotificationAsync = mockStable(() => Promise.resolve(undefined));
const mockGetAllScheduledNotificationsAsync = mockStable(() => Promise.resolve([]));
const mockGetPresentedNotificationsAsync = mockStable(() => Promise.resolve([]));
const mockDismissNotificationAsync = mockStable(() => Promise.resolve(undefined));
const mockSetBadgeCountAsync = mockStable(() => Promise.resolve(undefined));
const mockGetBadgeCountAsync = mockStable(() => Promise.resolve(0));
// Cold-start handling in app/_layout.tsx uses the SYNCHRONOUS pair. The `…Async`
// variants are deprecated in SDK 57 and are deliberately not mocked here — mocking
// them as promises would let the cold-start path pass against a shape the real
// module no longer returns.
const mockGetLastNotificationResponse = mockStable(() => null);
const mockClearLastNotificationResponse = jest.fn();

module.exports = {
  __esModule: true,

  // The iOS permission enums are part of the module's public surface and tests
  // read them off it (`IosAuthorizationStatus.PROVISIONAL`). They were missing,
  // so every such reference was `undefined` and the permission fixtures built
  // from them modelled a state the platform never reports. Values mirror
  // expo-notifications/build/NotificationPermissions.types.
  IosAlertStyle: { NONE: 0, BANNER: 1, ALERT: 2 },
  IosAllowsPreviews: { NEVER: 0, ALWAYS: 1, WHEN_AUTHENTICATED: 2 },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },

  setNotificationHandler: mockSetNotificationHandler,
  setNotificationCategoryAsync: mockSetNotificationCategoryAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  addNotificationsDroppedListener: mockAddNotificationsDroppedListener,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  getPresentedNotificationsAsync: mockGetPresentedNotificationsAsync,
  dismissNotificationAsync: mockDismissNotificationAsync,
  setBadgeCountAsync: mockSetBadgeCountAsync,
  getBadgeCountAsync: mockGetBadgeCountAsync,
  getLastNotificationResponse: mockGetLastNotificationResponse,
  clearLastNotificationResponse: mockClearLastNotificationResponse,

  // Constants
  // What `actionIdentifier` holds when the user taps the notification body
  // itself, on both platforms (expo-notifications/build/NotificationsEmitter).
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  AndroidNotificationPriority: {
    MIN: 'min',
    LOW: 'low',
    DEFAULT: 'default',
    HIGH: 'high',
    MAX: 'max',
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    CALENDAR: 'calendar',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    YEARLY: 'yearly',
    DATE: 'date',
  },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },

  // Expose mocks for test verification
  __mocks: {
    setNotificationHandler: mockSetNotificationHandler,
    setNotificationCategoryAsync: mockSetNotificationCategoryAsync,
    setNotificationChannelAsync: mockSetNotificationChannelAsync,
    addNotificationReceivedListener: mockAddNotificationReceivedListener,
    addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
    addNotificationsDroppedListener: mockAddNotificationsDroppedListener,
    getPermissionsAsync: mockGetPermissionsAsync,
    requestPermissionsAsync: mockRequestPermissionsAsync,
    scheduleNotificationAsync: mockScheduleNotificationAsync,
    cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
    cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
    getPresentedNotificationsAsync: mockGetPresentedNotificationsAsync,
    dismissNotificationAsync: mockDismissNotificationAsync,
    setBadgeCountAsync: mockSetBadgeCountAsync,
    getBadgeCountAsync: mockGetBadgeCountAsync,
    getLastNotificationResponse: mockGetLastNotificationResponse,
    clearLastNotificationResponse: mockClearLastNotificationResponse,
  },
};
