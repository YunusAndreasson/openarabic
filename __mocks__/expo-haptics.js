// Mock haptic feedback with realistic behavior
const mockImpactAsync = jest.fn().mockImplementation(async style => {
  if (!['Light', 'Medium', 'Heavy'].includes(style)) {
    throw new Error(`Invalid haptic style: ${style}`);
  }
  return Promise.resolve();
});

const mockSelectionAsync = jest.fn().mockResolvedValue(undefined);

const mockNotificationAsync = jest.fn().mockImplementation(async type => {
  if (!['Success', 'Warning', 'Error'].includes(type)) {
    throw new Error(`Invalid notification type: ${type}`);
  }
  return Promise.resolve();
});

module.exports = {
  __esModule: true,
  impactAsync: mockImpactAsync,
  selectionAsync: mockSelectionAsync,
  notificationAsync: mockNotificationAsync,
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
  // Expose mocks for test verification
  __mocks: {
    impactAsync: mockImpactAsync,
    selectionAsync: mockSelectionAsync,
    notificationAsync: mockNotificationAsync,
  },
};
