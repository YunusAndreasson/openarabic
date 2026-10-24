import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { analytics } from '@/services/analytics';
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
   * Validates the typed confirmation, deletes the account and navigates to
   * auth. Owns the whole flow, failure included: it never throws, and on
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
  // Form state
  const [fetchedUserEmail, setFetchedUserEmail] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');

  const queryClient = useQueryClient();

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
   * Shows success toast and navigates to auth screen
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    // Validate confirmation text
    if (!validateConfirmation(confirmationText)) {
      return;
    }

    setLoading(true);

    try {
      // Delete account via service (no email needed - uses session)
      await AccountDeletionService.deleteAccount();

      // The deleted account's word/audio/reading/streak data otherwise stays
      // resident in the query cache for the rest of the process lifetime —
      // a stale leftover of an account the app just confirmed was deleted.
      queryClient.clear();

      // Track successful deletion
      // Deletion is already irreversible. Analytics must never turn a completed
      // deletion into a user-visible failure state.
      try {
        await analytics.track(ANALYTICS_EVENTS.ACCOUNT_DELETED, {
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Best effort only.
      }

      // Show success feedback. No mount check: the account is gone either way,
      // and an auth-state update that has already unmounted this screen used
      // to swallow the only confirmation the learner got.
      successFeedback();
      showSuccessToast(STRINGS.DELETE_ACCOUNT_SUCCESS);

      // Navigate before the auth-state update unmounts this screen. Deferring
      // behind an isMounted check can strand the user on a stale protected tab.
      router.replace(ROUTE_PATHS.AUTH);
    } catch (error) {
      await handleError(error, {
        toastMessage: STRINGS.FAILED_TO_DELETE_ACCOUNT,
        analyticsEventName: 'Account_Deletion_Failed',
        sentrySeverity: 'error',
        showToast: true,
      });

      setLoading(false);
    }
  }, [confirmationText, validateConfirmation, queryClient]);

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
