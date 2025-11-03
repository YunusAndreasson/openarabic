import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { AccountDeletionService } from '@/services/accountDeletion';
import { handleError, showSuccessToast } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UseAccountDeletionReturn {
  // State
  email: string;
  setEmail: (value: string) => void;
  loading: boolean;
  emailError: string;

  // Methods
  validateEmail: (email: string) => boolean;
  deleteAccount: () => Promise<void>;
  getCurrentUserEmail: () => Promise<string | null>;
}

/**
 * Hook handling account deletion logic with email confirmation
 * Provides validation, loading states, and deletion flow
 */
export function useAccountDeletion(): UseAccountDeletionReturn {
  // Form state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isMountedRef = useMountSafety();

  /**
   * Validates email format
   */
  const validateEmail = useCallback(
    (value: string) => {
      if (!value) {
        if (isMountedRef.current) setEmailError(STRINGS.ENTER_VALID_EMAIL);
        return false;
      }
      if (!EMAIL_REGEX.test(value)) {
        if (isMountedRef.current) setEmailError(STRINGS.ENTER_VALID_EMAIL);
        return false;
      }
      if (isMountedRef.current) setEmailError('');
      return true;
    },
    [isMountedRef],
  );

  /**
   * Gets the current user's email for verification
   */
  const getCurrentUserEmail = useCallback(async (): Promise<string | null> => {
    return AccountDeletionService.getCurrentUserEmail();
  }, []);

  /**
   * Deletes the user's account after validation
   * Shows success toast and navigates to auth screen
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      // Delete account via service
      await AccountDeletionService.deleteAccount(email);

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
  }, [email, validateEmail, isMountedRef]);

  return {
    // State
    email,
    setEmail,
    loading,
    emailError,

    // Methods
    validateEmail,
    deleteAccount,
    getCurrentUserEmail,
  };
}
