/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { renderHook } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';

import { AuthContext } from '@/components/providers/AuthProvider';
import { useAuth } from '@/hooks/auth/useAuth';

describe('useAuth', () => {
  test('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });

  test('returns context when inside AuthProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider
        value={{
          session: null,
          user: null,
          isLoading: false,
          authError: null,
          refreshSession: jest.fn(async () => null),
          isAuthenticated: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBeFalsy();
  });
});
