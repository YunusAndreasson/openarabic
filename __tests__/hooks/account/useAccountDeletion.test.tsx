import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { useAccountDeletion } from '@/hooks/account/useAccountDeletion';
import { AccountDeletionService } from '@/services/accountDeletion';

const mockUseAuth = jest.fn();

jest.mock('@/hooks/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/services/accountDeletion', () => ({
  AccountDeletionService: {
    getCurrentUserEmail: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

const getCurrentUserEmail = jest.mocked(AccountDeletionService.getCurrentUserEmail);

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAccountDeletion identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the authenticated user email immediately without a second network lookup', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'learner@example.com' } });

    const { result } = renderHook(() => useAccountDeletion(), { wrapper });

    expect(result.current.userEmail).toBe('learner@example.com');
    expect(getCurrentUserEmail).not.toHaveBeenCalled();
  });

  it('falls back to the service when the session has no email', async () => {
    mockUseAuth.mockReturnValue({ user: { email: null } });
    getCurrentUserEmail.mockResolvedValue('fallback@example.com');

    const { result } = renderHook(() => useAccountDeletion(), { wrapper });

    await waitFor(() => expect(result.current.userEmail).toBe('fallback@example.com'));
    expect(getCurrentUserEmail).toHaveBeenCalledTimes(1);
  });
});
