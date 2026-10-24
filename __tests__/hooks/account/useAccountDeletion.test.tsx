// The real client: the deletion clears its cache, and jest.setup.js mocks the
// library for every suite by default.
jest.unmock('@tanstack/react-query');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { STRINGS } from '@/constants/strings';
import { useAccountDeletion } from '@/hooks/account/useAccountDeletion';
import { AccountDeletionService } from '@/services/accountDeletion';
import { handleError, showSuccessToast } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

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
  router: { replace: jest.fn(), back: jest.fn() },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(async () => undefined),
  showSuccessToast: jest.fn(),
}));

jest.mock('@/utils/haptics', () => ({
  successFeedback: jest.fn(),
}));

const getCurrentUserEmail = jest.mocked(AccountDeletionService.getCurrentUserEmail);
const deleteAccountService = jest.mocked(AccountDeletionService.deleteAccount);

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

describe('useAccountDeletion deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { email: 'learner@example.com' } });
  });

  const renderWithConfirmation = (text: string) => {
    const hook = renderHook(() => useAccountDeletion(), { wrapper });
    act(() => {
      hook.result.current.setConfirmationText(text);
    });
    return hook;
  };

  it('deletes nothing until the confirmation word is typed', async () => {
    const { result } = renderWithConfirmation('delete');

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(deleteAccountService).not.toHaveBeenCalled();
    expect(result.current.confirmationError).toBe(STRINGS.DELETE_ACCOUNT_CONFIRMATION_MISMATCH);
  });

  it('on success confirms, then navigates to auth itself', async () => {
    deleteAccountService.mockResolvedValue(undefined);
    const { result } = renderWithConfirmation(STRINGS.DELETE_ACCOUNT_CONFIRMATION_WORD);

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(successFeedback).toHaveBeenCalledTimes(1);
    expect(showSuccessToast).toHaveBeenCalledWith(STRINGS.DELETE_ACCOUNT_SUCCESS);
    expect(router.replace).toHaveBeenCalledWith('/auth');
  });

  it('confirms the deletion even when the screen is already gone', async () => {
    // The sign-out the deletion causes can unmount this screen before the
    // request settles. The account is deleted either way, and the toast and
    // haptic used to be skipped behind a mount check.
    let finishDeletion: (() => void) | undefined;
    deleteAccountService.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finishDeletion = resolve;
        }),
    );
    const { result, unmount } = renderWithConfirmation(STRINGS.DELETE_ACCOUNT_CONFIRMATION_WORD);

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.deleteAccount();
    });
    await waitFor(() => expect(finishDeletion).toBeDefined());
    unmount();

    await act(async () => {
      finishDeletion?.();
      await pending;
    });

    expect(successFeedback).toHaveBeenCalledTimes(1);
    expect(showSuccessToast).toHaveBeenCalledWith(STRINGS.DELETE_ACCOUNT_SUCCESS);
  });

  it('on failure reports, keeps the typed confirmation, and stays on the screen', async () => {
    deleteAccountService.mockRejectedValue(new Error('server said no'));
    const { result } = renderWithConfirmation(STRINGS.DELETE_ACCOUNT_CONFIRMATION_WORD);

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ toastMessage: STRINGS.FAILED_TO_DELETE_ACCOUNT }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.confirmationText).toBe(STRINGS.DELETE_ACCOUNT_CONFIRMATION_WORD);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});
