import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { AccountDeletionService } from '@/services/accountDeletion';
import { handleError, showSuccessToast } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

export interface UseAccountDeletionReturn {
  // State
  userEmail: string | null;
  confirmationText: string;
  setConfirmationText: (value: string) => void;
  loading: boolean;
  confirmationError: string;

  // Methods
  /**
   * Validates the typed confirmation, deletes the account and returns to
   * the reader. Owns the whole flow, failure included: it never throws, and on
   * failure the screen stays put with what the learner typed.
   */
  deleteAccount: () => Promise<void>;
}

/**
 * Hook handling account deletion logic with DELETE confirmation
 * Provides validation, loading states, and deletion flow
 * Supports all auth types including private relay emails
 */
export function useAccountDeletion(): UseAccountDeletionReturn {
  const { user } = useAuth();
  const owner = user?.id ?? null;
  // Form state
  const [fetchedUserEmail, setFetchedUserEmail] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');

  // Fetch user email on mount
  useEffect(() => {
    if (user?.email) return;
    const fetchEmail = async () => {
      const email = await AccountDeletionService.getCurrentUserEmail();
      setFetchedUserEmail(email);
    };
    void fetchEmail();
  }, [user?.email]);

  /**
   * Validates confirmation text matches "DELETE"
   */
  const validateConfirmation = useCallback((text: string) => {
    const trimmedText = text.trim();
    if (trimmedText !== STRINGS.DELETE_ACCOUNT_CONFIRMATION_WORD) {
      setConfirmationError(STRINGS.DELETE_ACCOUNT_CONFIRMATION_MISMATCH);
      return false;
    }
    setConfirmationError('');
    return true;
  }, []);

  /**
   * Deletes the user's account after validation
   * Shows success toast and returns to the public reader
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    // Validate confirmation text
    if (!validateConfirmation(confirmationText)) {
      return;
    }

    setLoading(true);

    try {
      await AccountDeletionService.deleteAccount(owner);

      // Show success feedback. No mount check: the account is gone either way,
      // and an auth-state update that has already unmounted this screen used
      // to swallow the only confirmation the learner got.
      successFeedback();
      showSuccessToast(STRINGS.DELETE_ACCOUNT_SUCCESS);

      // Navigate before the auth-state update unmounts this screen. Deferring
      // behind an isMounted check can strand the user on a stale protected tab.
      router.replace(ROUTE_PATHS.EXPLORE_TAB);
    } catch (error) {
      await handleError(error, {
        toastMessage: STRINGS.FAILED_TO_DELETE_ACCOUNT,
        analyticsEventName: 'Account_Deletion_Failed',
        sentrySeverity: 'error',
        showToast: true,
      });

      setLoading(false);
    }
  }, [confirmationText, owner, validateConfirmation]);

  return {
    // State
    userEmail: user?.email ?? fetchedUserEmail,
    confirmationText,
    setConfirmationText,
    loading,
    confirmationError,

    // Methods
    deleteAccount,
  };
}
