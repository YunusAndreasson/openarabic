import { describe, it, expect, jest } from '@jest/globals';

// Mock all external dependencies to avoid any initialization issues
jest.mock('@/services/supabase', () => ({
  supabase: { auth: {} },
  setupSupabaseAppStateListener: jest.fn(),
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  default: {
    // @ts-expect-error Mock implementation for testing
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
    addEventListener: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    currentState: 'active',
  },
}));

describe('useProvideAuth', () => {
  it('module can be imported without errors', () => {
    // This test just verifies the module can be imported
    // The actual hook functionality is tested through integration tests
    expect(() => {
      require('../../../hooks/auth/useProvideAuth');
    }).not.toThrow();
  });

  it('exports the expected hook function', () => {
    const module = require('../../../hooks/auth/useProvideAuth');
    expect(module.useProvideAuth).toBeDefined();
    expect(typeof module.useProvideAuth).toBe('function');
  });
});
