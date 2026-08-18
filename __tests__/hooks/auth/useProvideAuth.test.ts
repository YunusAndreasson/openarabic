/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

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
    fetch: jest.fn(async (..._args: unknown[]) => ({ isConnected: true })),
    addEventListener: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((..._args: unknown[]) => ({ remove: jest.fn() })),
    currentState: 'active',
  },
}));

describe('useProvideAuth', () => {
  test('module can be imported without errors', () => {
    // This test just verifies the module can be imported
    // The actual hook functionality is tested through integration tests
    expect(() => {
      require('../../../hooks/auth/useProvideAuth');
    }).not.toThrow();
  });

  test('exports the expected hook function', () => {
    const module = require('../../../hooks/auth/useProvideAuth');
    expect(module.useProvideAuth).toBeDefined();
    expect(typeof module.useProvideAuth).toBe('function');
  });
});
