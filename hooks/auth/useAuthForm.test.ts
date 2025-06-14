import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';

import { useAuthForm, PASSWORD_REQUIREMENTS } from './useAuthForm';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      initialize: jest.fn().mockResolvedValue(undefined),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com' } }, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com' } }, error: null }),
      startAutoRefresh: jest.fn(),
    },
  },
}));

describe('useAuthForm', () => {
  it('validates email correctly', () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.validateEmail('bad');
    });
    expect(result.current.emailError).toBe('Enter a valid email');

    act(() => {
      result.current.validateEmail('good@example.com');
    });
    expect(result.current.emailError).toBe('');
  });

  it('validates password correctly', () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.validatePassword('short');
    });
    expect(result.current.passwordError).toContain(`${PASSWORD_REQUIREMENTS.minLength}`);

    act(() => {
      result.current.validatePassword('Password1');
    });
    expect(result.current.passwordError).toBe('');
  });

  it('toggles registration mode', () => {
    const { result } = renderHook(() => useAuthForm());

    expect(result.current.isRegistering).toBe(true);
    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.isRegistering).toBe(false);
  });

  it('calls supabase on sign in', async () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('Password1');
    });

    await act(async () => {
      await result.current.signInWithEmail();
    });

    const { supabase } = require('@/services/supabase');
    expect(supabase.auth.initialize).toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1',
    });
  });
});
