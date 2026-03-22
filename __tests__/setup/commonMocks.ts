/**
 * Shared test mocks used across multiple test files
 * Import these to avoid duplication
 */

/**
 * Mock expo-haptics
 * Used in: visualPracticeFlow, integration tests, component tests
 */
export const mockExpoHaptics = () => {
  jest.mock('expo-haptics', () => ({
    selectionAsync: jest.fn(),
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  }));
};

export const mockHaptics = () => {
  jest.mock('@/utils/haptics', () => ({
    lightFeedback: jest.fn(),
    mediumFeedback: jest.fn(),
    successFeedback: jest.fn(),
    selectionFeedback: jest.fn(),
    errorFeedback: jest.fn(),
  }));
};

/**
 * Mock expo-router
 * Used in: flow tests, integration tests
 */
export const mockExpoRouter = () => {
  jest.mock('expo-router', () => ({
    router: {
      replace: jest.fn(),
      back: jest.fn(),
      push: jest.fn(),
    },
    useLocalSearchParams: jest.fn(() => ({})),
    useRouter: jest.fn(() => ({
      replace: jest.fn(),
      back: jest.fn(),
      push: jest.fn(),
    })),
  }));
};

/**
 * Mock useAuth hook
 * Used in: multiple integration tests
 */
export const mockUseAuth = (mockUserId: string = 'test-user-123') => {
  jest.mock('@/hooks/auth', () => ({
    useAuth: () => ({ user: { id: mockUserId } }),
  }));
};
