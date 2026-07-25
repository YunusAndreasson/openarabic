// Mock haptic feedback.
//
// NOTE: jest.config.js sets `resetMocks: true`, which strips the implementation
// from every jest.fn() before each test — so implementations defined *here* never
// survive to run. jest.setup.js re-arms these as promise-returning in a global
// beforeEach; that is what makes them usable. Keep the shape in sync with the real
// expo-haptics module (every *Async export returns Promise<void>) so production
// code can chain .catch() on them.
const mockImpactAsync = jest.fn();
const mockSelectionAsync = jest.fn();
const mockNotificationAsync = jest.fn();
const mockPerformAndroidHapticsAsync = jest.fn();

module.exports = {
  __esModule: true,
  impactAsync: mockImpactAsync,
  selectionAsync: mockSelectionAsync,
  notificationAsync: mockNotificationAsync,
  performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
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
  AndroidHaptics: {
    Segment_Tick: 'Segment_Tick',
    Virtual_Key: 'Virtual_Key',
    Context_Click: 'Context_Click',
    Confirm: 'Confirm',
    Reject: 'Reject',
  },
  // Expose mocks for test verification
  __mocks: {
    impactAsync: mockImpactAsync,
    selectionAsync: mockSelectionAsync,
    notificationAsync: mockNotificationAsync,
    performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
  },
};
