import { renderHook } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';

import { AuthContext } from '@/components/providers/AuthProvider';
import { useAuth } from './useAuth';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });

  it('returns context when inside AuthProvider', () => {
    const wrapper = ({ children }) => (
      <AuthContext.Provider
        value={{
          session: null,
          user: null,
          isLoading: false,
          authError: null,
          refreshSession: jest.fn(),
          isAuthenticated: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
  });
});
