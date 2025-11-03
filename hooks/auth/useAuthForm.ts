import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { handleError, showSuccessToast } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

/**
 * Email validation regex and password requirements
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
} as const;

export interface UseAuthFormReturn {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loading: boolean;
  emailError: string;
  passwordError: string;
  isRegistering: boolean;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => boolean;
  signInWithEmail: () => Promise<void>;
  signUpWithEmail: () => Promise<void>;
  toggleMode: () => void;
  resetPassword: () => Promise<void>;
}

/**
 * Hook handling authentication form logic
 */
export function useAuthForm(): UseAuthFormReturn {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true); // Default to Create Account for new user acquisition

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isMountedRef = useMountSafety();

  const validateEmail = useCallback(
    (value: string) => {
      if (!value) return false;
      if (!EMAIL_REGEX.test(value)) {
        if (isMountedRef.current) setEmailError(STRINGS.ENTER_VALID_EMAIL);
        return false;
      }
      if (isMountedRef.current) setEmailError('');
      return true;
    },
    [isMountedRef],
  );

  const validatePassword = useCallback(
    (value: string) => {
      if (!value) {
        if (isMountedRef.current) setPasswordError(STRINGS.ENTER_PASSWORD);
        return false;
      }
      if (value.length < PASSWORD_REQUIREMENTS.minLength) {
        if (isMountedRef.current)
          setPasswordError(
            STRINGS.PASSWORD_USE_AT_LEAST_TEMPLATE.replace(
              '{minLength}',
              PASSWORD_REQUIREMENTS.minLength.toString(),
            ),
          );
        return false;
      }
      if (isMountedRef.current) setPasswordError('');
      return true;
    },
    [isMountedRef],
  );

  const signInWithEmail = useCallback(async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (!isMountedRef.current) return;
        Sentry.captureMessage('Sign in error', {
          level: 'error',
          tags: { location: 'auth_component' },
          extra: { error: error.message },
        });
        handleError(error, {
          toastMessage: `${STRINGS.SIGN_IN_FAILED}. ${error.message}`,
          analyticsEventName: 'Sign_In_Error',
          sentrySeverity: 'error',
        });
      } else {
        await analytics.identify(data.user.id, {
          email: data.user.email,
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('email');
        successFeedback();
        router.replace(ROUTE_PATHS.LIBRARY_TAB);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      handleError(err instanceof Error ? err : new Error('Sign in error'), {
        toastMessage: `${STRINGS.SIGN_IN_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Sign_In_Error',
        sentrySeverity: 'error',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword, isMountedRef]);

  const signUpWithEmail = useCallback(async () => {
    console.log('[SignUp] Button pressed', { email, password: '***' });
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    console.log('[SignUp] Validation results', { isEmailValid, isPasswordValid });
    if (!isEmailValid || !isPasswordValid) {
      console.log('[SignUp] Validation failed, returning early');
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);
    console.log('[SignUp] Starting sign-up process...');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      console.log('[SignUp] Supabase response', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        userId: data?.user?.id
      });
      if (error) {
        if (!isMountedRef.current) return;
        console.log('[SignUp] Sign-up error:', error.message);
        handleError(error, {
          toastMessage: `${STRINGS.ACCOUNT_CREATION_FAILED}. ${error.message}`,
          analyticsEventName: 'Sign_Up_Error',
          sentrySeverity: 'error',
        });
      } else {
        console.log('[SignUp] Sign-up successful, user:', data?.user?.id);

        // Check if email confirmation is disabled (session created immediately)
        const hasImmediateSession = !!data?.session;
        console.log('[SignUp] Has immediate session:', hasImmediateSession);

        // CRITICAL: Show toast immediately before any async operations that might unmount component
        successFeedback();

        // If session exists, user is auto-confirmed and can be logged in
        if (hasImmediateSession) {
          console.log('[SignUp] Session created immediately, navigating to library');
          showSuccessToast(STRINGS.SUCCESS, 3000);
          // Navigate to library after brief delay to show toast
          setTimeout(() => {
            router.replace(ROUTE_PATHS.LIBRARY_TAB);
          }, 500);
        } else {
          // Email confirmation required
          console.log('[SignUp] Email confirmation required, showing email check message');
          showSuccessToast(STRINGS.CHECK_EMAIL_CONFIRMATION, 5000);
        }

        // Analytics can happen asynchronously without blocking UX
        if (data?.user) {
          analytics.identify(data.user.id, {
            email: data.user.email,
            created_at: new Date().toISOString(),
          }).catch(err => {
            console.log('[SignUp] Analytics identify failed:', err);
          });
        }
        analytics.trackSignUp('email').catch(err => {
          console.log('[SignUp] Analytics track failed:', err);
        });
        console.log('[SignUp] Analytics calls dispatched');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      handleError(err instanceof Error ? err : new Error('Sign up error'), {
        toastMessage: `${STRINGS.ACCOUNT_CREATION_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Sign_Up_Error',
        sentrySeverity: 'error',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword, isMountedRef]);

  const toggleMode = useCallback(() => {
    setIsRegistering(!isRegistering);
    setEmailError('');
    setPasswordError('');
  }, [isRegistering]);

  const resetPassword = useCallback(async (): Promise<void> => {
    const isEmailValid = validateEmail(email);
    if (!isEmailValid) {
      // Show error message if email is invalid
      handleError(new Error('Invalid email'), {
        toastMessage: email ? STRINGS.ENTER_VALID_EMAIL : STRINGS.ERROR_EMPTY_EMAIL,
        analyticsEventName: 'Password_Reset_Invalid_Email',
        sentrySeverity: 'info',
        showToast: true,
      });
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'open-arabic://reset-password',
      });

      if (error) {
        if (!isMountedRef.current) return;
        Sentry.captureException(error, {
          tags: { location: 'password_reset' },
          level: 'warning',
        });
        handleError(error, {
          toastMessage: STRINGS.RESET_PASSWORD_ERROR,
          analyticsEventName: 'Password_Reset_Error',
          sentrySeverity: 'error',
        });
      } else {
        if (!isMountedRef.current) return;
        // Show long-lasting success toast (5 seconds)
        showSuccessToast(STRINGS.RESET_PASSWORD_EMAIL_SENT, 5000);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      handleError(err instanceof Error ? err : new Error('Password reset error'), {
        toastMessage: STRINGS.RESET_PASSWORD_ERROR,
        analyticsEventName: 'Password_Reset_Error',
        sentrySeverity: 'error',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, validateEmail, isMountedRef]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    emailError,
    passwordError,
    isRegistering,
    validateEmail,
    validatePassword,
    signInWithEmail,
    signUpWithEmail,
    toggleMode,
    resetPassword,
  };
}
