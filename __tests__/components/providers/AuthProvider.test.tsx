/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * AuthProvider Tests
 *
 * Tests the AuthProvider component which provides authentication context.
 * This is a thin wrapper around useProvideAuth hook.
 *
 * Note: This test suite is minimal because AuthProvider is a simple wrapper.
 * The real authentication logic is tested in useProvideAuth hook tests.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AuthContext, AuthProvider } from '@/components/providers/AuthProvider';

// Mock useProvideAuth to avoid complex auth setup
jest.mock('@/hooks/auth/useProvideAuth', () => ({
  useProvideAuth: () => ({
    session: null,
    user: null,
    isLoading: false,
    authError: null,
    refreshSession: jest.fn(),
    isAuthenticated: false,
  }),
}));

describe('AuthProvider', () => {
  describe('Basic Rendering', () => {
    test('should render children without crashing', () => {
      const { getByText } = render(
        <AuthProvider>
          <Text>Test Child</Text>
        </AuthProvider>,
      );

      expect(getByText('Test Child')).toBeDefined();
    });

    test('should render multiple children', () => {
      const { getByText } = render(
        <AuthProvider>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
        </AuthProvider>,
      );

      expect(getByText('Child 1')).toBeDefined();
      expect(getByText('Child 2')).toBeDefined();
    });
  });

  describe('Context Export', () => {
    test('should export AuthContext', () => {
      expect(AuthContext).toBeDefined();
    });

    test('should have null as default context value', () => {
      // Read the default the way a consumer does; `_currentValue` is a React
      // internal that is not part of the Context type.
      const Probe = () => <Text testID="ctx">{String(React.useContext(AuthContext))}</Text>;
      const { getByTestId } = render(<Probe />);

      expect(getByTestId('ctx').props.children).toBe('null');
    });
  });
});
