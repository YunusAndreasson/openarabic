/**
 * Shared test mocks used across multiple test files
 * Import these to avoid duplication
 */

// NOTE: there is deliberately no mockExpoHaptics() helper here. expo-haptics is
// mocked globally for every suite through jest.config.js `moduleNameMapper` →
// __mocks__/expo-haptics.js, and jest.setup.js re-arms its promise-returning
// implementations per test (needed because `resetMocks: true` strips them).
// A local jest.mock('expo-haptics', …) shadows that with a second mock object
// that nothing re-arms, so production code chaining .catch() breaks.

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
