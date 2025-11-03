import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
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
  validateConfirmation: (text: string) => boolean;
  deleteAccount: () => Promise<void>;
}

/**
 * Hook handling account deletion logic with DELETE confirmation
 * Provides validation, loading states, and deletion flow
 * Supports all auth types including private relay emails
 */
export function useAccountDeletion(): UseAccountDeletionReturn {
  // Form state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');

  const isMountedRef = useMountSafety();

  // Fetch user email on mount
  useEffect(() => {
    const fetchEmail = async () => {
      const email = await AccountDeletionService.getCurrentUserEmail();
      if (isMountedRef.current) {
        setUserEmail(email);
      }
    };
    fetchEmail();
  }, [isMountedRef]);

  /**
   * Validates confirmation text matches "DELETE"
   */
  const validateConfirmation = useCallback(
    (text: string) => {
      const trimmedText = text.trim().toUpperCase();
      if (trimmedText !== STRINGS.DELETE_ACCOUNT_CONFIRMATION_WORD) {
        if (isMountedRef.current) {
          setConfirmationError(STRINGS.DELETE_ACCOUNT_CONFIRMATION_MISMATCH);
        }
        return false;
      }
      if (isMountedRef.current) setConfirmationError('');
      return true;
    },
    [isMountedRef],
  );

  /**
   * Deletes the user's account after validation
   * Shows success toast and navigates to auth screen
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    // Validate confirmation text
    if (!validateConfirmation(confirmationText)) {
      return;
    }

    setLoading(true);

    try {
      // Delete account via service (no email needed - uses session)
      await AccountDeletionService.deleteAccount();

      // Track successful deletion
      await analytics.track('Account_Deleted', {
        timestamp: new Date().toISOString(),
      });

      // Show success feedback
      if (isMountedRef.current) {
        successFeedback();
        showSuccessToast(STRINGS.DELETE_ACCOUNT_SUCCESS);
      }

      // Navigate to auth screen after a brief delay
      setTimeout(() => {
        if (isMountedRef.current) {
          router.replace(ROUTE_PATHS.AUTH);
        }
      }, 500);
    } catch (error) {
      // Error is already handled in the service layer
      // Just log for debugging if needed
      await handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: STRINGS.FAILED_TO_DELETE_ACCOUNT,
        analyticsEventName: 'Account_Deletion_Failed',
        sentrySeverity: 'error',
        showToast: true,
      });

      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [confirmationText, validateConfirmation, isMountedRef]);

  return {
    // State
    userEmail,
    confirmationText,
    setConfirmationText,
    loading,
    confirmationError,

    // Methods
    validateConfirmation,
    deleteAccount,
  };
}
