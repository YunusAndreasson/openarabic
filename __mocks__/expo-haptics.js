// Mock haptic feedback.
//
// mockStable (jest.setup.js) keeps these promise-returning in every test, past
// `resetMocks`. Keep the shape in sync with the real expo-haptics module (every
// *Async export returns Promise<void>) so production code can chain .catch() on
// them.
const mockImpactAsync = mockStable(() => Promise.resolve());
const mockSelectionAsync = mockStable(() => Promise.resolve());
const mockNotificationAsync = mockStable(() => Promise.resolve());
const mockPerformAndroidHapticsAsync = mockStable(() => Promise.resolve());

module.exports = {
  __esModule: true,
  impactAsync: mockImpactAsync,
  selectionAsync: mockSelectionAsync,
  notificationAsync: mockNotificationAsync,
  performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
  // Keep these enums complete. They were missing Rigid/Soft and Clock_Tick,
  // which meant detentFeedback() resolved its style to `undefined` in every
  // suite but the dedicated haptics one — it never threw, so any assertion on
  // the argument passed vacuously.
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
    Rigid: 'Rigid',
    Soft: 'Soft',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
  AndroidHaptics: {
    Segment_Tick: 'Segment_Tick',
    Segment_Frequent_Tick: 'Segment_Frequent_Tick',
    Clock_Tick: 'Clock_Tick',
    Virtual_Key: 'Virtual_Key',
    Context_Click: 'Context_Click',
    Long_Press: 'Long_Press',
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
