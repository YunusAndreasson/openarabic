// Mock expo-notifications for testing
// This provides a basic mock that can be overridden in individual tests

const mockSubscription = { remove: jest.fn() };

const mockSetNotificationHandler = jest.fn();
const mockSetNotificationCategoryAsync = jest.fn().mockResolvedValue(undefined);
const mockSetNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
const mockAddNotificationReceivedListener = jest.fn(() => mockSubscription);
const mockAddNotificationResponseReceivedListener = jest.fn(() => mockSubscription);
const mockAddNotificationsDroppedListener = jest.fn(() => mockSubscription);
const mockGetPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const mockRequestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const mockScheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');
const mockCancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
const mockCancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
const mockGetAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);
const mockGetPresentedNotificationsAsync = jest.fn().mockResolvedValue([]);
const mockDismissNotificationAsync = jest.fn().mockResolvedValue(undefined);
const mockSetBadgeCountAsync = jest.fn().mockResolvedValue(undefined);
const mockGetBadgeCountAsync = jest.fn().mockResolvedValue(0);
const mockClearLastNotificationResponseAsync = jest.fn().mockResolvedValue(undefined);

module.exports = {
  __esModule: true,
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
  clearLastNotificationResponseAsync: mockClearLastNotificationResponseAsync,

  // Constants
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
    clearLastNotificationResponseAsync: mockClearLastNotificationResponseAsync,
  },
};
