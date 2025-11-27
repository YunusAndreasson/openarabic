/**
 * Shared Expo Module Mocks
 *
 * Reusable mock factories for Expo modules to reduce duplication across tests.
 * These mocks follow patterns established during comprehensive testing sessions.
 *
 * Usage:
 * ```typescript
 * jest.mock('expo-notifications', () => createExpoNotificationsMock());
 * ```
 */

/**
 * Creates a mock for expo-notifications module
 * Based on patterns from notificationService.test.ts
 */
export const createExpoNotificationsMock = () => ({
  __esModule: true,

  // Notification handler
  setNotificationHandler: jest.fn(),

  // Scheduling
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined),

  // Permissions
  getPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
    ios: { allowsBadge: true, status: 2 },
  }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
    ios: { allowsBadge: true, status: 2 },
  }),

  // Badge management
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  getBadgeCountAsync: jest.fn().mockResolvedValue(0),

  // Configuration
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),

  // Listeners
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationsDroppedListener: jest.fn(() => ({ remove: jest.fn() })),

  // Constants
  AndroidImportance: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },

  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
});

/**
 * Creates a mock for expo-background-task module
 * Based on patterns from backgroundTasks.test.ts
 */
export const createExpoBackgroundTaskMock = () => ({
  __esModule: true,

  BackgroundTaskResult: {
    Success: 'Success',
    Failed: 'Failed',
    NewData: 'NewData',
  },

  BackgroundTaskStatus: {
    Available: 1,
    Unavailable: 2,
    Denied: 3,
  },

  getStatusAsync: jest.fn().mockResolvedValue(1), // Available by default
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
});

/**
 * Creates a mock for expo-task-manager module
 * Based on patterns from backgroundTasks.test.ts
 */
export const createExpoTaskManagerMock = () => ({
  __esModule: true,
  defineTask: jest.fn(), // Module-level code, just needs to not throw
});

/**
 * Creates a mock for expo-audio module
 * Based on patterns from audioPlayer.test.ts
 */
export const createExpoAudioMock = () => {
  const mockPlayer = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };

  return {
    __esModule: true,
    createAudioPlayer: jest.fn(() => mockPlayer),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    configureAudioSessionAsync: jest.fn().mockResolvedValue(undefined),
    AudioMode: {
      Default: 'default',
      MusicMix: 'musicMix',
    },
  };
};

/**
 * Creates a mock for expo-haptics module
 * Based on patterns from various component tests
 */
export const createExpoHapticsMock = () => ({
  __esModule: true,
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
});

/**
 * Creates a mock for React Native AppState
 * Based on patterns from audioPlayer.test.ts
 */
export const createReactNativeAppStateMock = () => ({
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
});
