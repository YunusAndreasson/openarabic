const React = require('react');

// Mock notification service with realistic behavior
const mockGetAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([]);
const mockScheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');
const mockCancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined);
const mockCancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
const mockSetNotificationHandler = jest.fn();
const mockGetPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
  granted: true,
  canAskAgain: true,
});
const mockRequestPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
  granted: true,
  canAskAgain: true,
});

module.exports = {
  __esModule: true,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
  setNotificationHandler: mockSetNotificationHandler,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  // Expose mocks for test verification
  __mocks: {
    getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
    scheduleNotificationAsync: mockScheduleNotificationAsync,
    cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
    cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
    setNotificationHandler: mockSetNotificationHandler,
    getPermissionsAsync: mockGetPermissionsAsync,
    requestPermissionsAsync: mockRequestPermissionsAsync,
  },
};
