import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
import { supabase } from '@/services/supabase';
import { getEmailError, getPasswordError } from '@/utils/authUtils';
import { handleError, showSuccessToast } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';
import { isKnownOffline } from '@/utils/network';

export interface UseAuthFormReturn {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loading: boolean;
  emailError: string;
  passwordError: string;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => boolean;
  signInWithEmail: () => Promise<void>;
  signUpWithEmail: () => Promise<void>;
  resetPassword: () => Promise<void>;
}

/** How a request that THREW is reported; a resolved `{ error }` is the request's own to handle. */
interface AuthRequestFailure {
  toastMessage: string;
  analyticsEventName: string;
  /** Shown under the password field as well, when the form has room for it. */
  fieldError?: string;
}

/**
 * Hook handling authentication form logic
 */
export function useAuthForm(): UseAuthFormReturn {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isMountedRef = useMountSafety();
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent navigation race conditions
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const validateEmail = useCallback((value: string) => {
    const error = getEmailError(value);
    setEmailError(error);
    return !error;
  }, []);

  const validatePassword = useCallback((value: string) => {
    const error = getPasswordError(value);
    setPasswordError(error);
    return !error;
  }, []);

  /**
   * One auth request, start to finish: the offline pre-flight, the loading
   * state, and the report if it throws.
   *
   * supabase-js has no built-in timeout: a signIn/signUp/resetPassword call made
   * while offline hangs indefinitely on the fetch rather than rejecting, leaving
   * the button stuck in a loading state with no way to recover short of leaving
   * the screen. Checking reachability first fails fast with a visible error
   * instead. It is a courtesy pre-flight, never a gate: `isKnownOffline` only
   * answers true for a definite `isConnected === false` and fails open when the
   * probe itself does — see its comment for the two ways a stricter check made
   * sign-in impossible.
   */
  const runAuthRequest = useCallback(
    async (request: () => Promise<void>, failure: AuthRequestFailure): Promise<void> => {
      if (await isKnownOffline()) {
        setPasswordError(STRINGS.NO_INTERNET_CONNECTION);
        void handleError(new Error('No network connection available'), {
          toastMessage: STRINGS.NO_INTERNET_CONNECTION,
          analyticsEventName: 'Auth_No_Network',
          captureSentry: false,
          trackAnalytics: false,
          showToast: true,
        });
        return;
      }

      // The one mount check left in this hook, because what follows is not a
      // state update: it creates an account, signs in (and navigates), or
      // sends an email. A form dismissed during the pre-flight sends nothing.
      if (!isMountedRef.current) return;
      setLoading(true);

      try {
        await request();
      } catch (err) {
        if (failure.fieldError) setPasswordError(failure.fieldError);
        void handleError(err, {
          toastMessage: failure.toastMessage,
          analyticsEventName: failure.analyticsEventName,
          sentrySeverity: 'error',
        });
      } finally {
        setLoading(false);
      }
    },
    [isMountedRef],
  );

  const signInWithEmail = useCallback(async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    await runAuthRequest(
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Show inline error so it's visible even when auth screen overlays the toast
          setPasswordError(error.message);
          void handleError(error, {
            toastMessage: `${STRINGS.SIGN_IN_FAILED}. ${error.message}`,
            analyticsEventName: 'Sign_In_Error',
            sentrySeverity: 'error',
          });
          return;
        }

        await analytics.identify(data.user.id, {
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('email');
        successFeedback();
        router.replace(ROUTE_PATHS.EXPLORE_TAB);
      },
      {
        toastMessage: `${STRINGS.SIGN_IN_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Sign_In_Error',
        fieldError: STRINGS.PLEASE_TRY_AGAIN,
      },
    );
  }, [email, password, validateEmail, validatePassword, runAuthRequest]);

  const signUpWithEmail = useCallback(async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    await runAuthRequest(
      async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          // "User already registered" is expected user behavior, not a system error
          const isAlreadyRegistered = error.message.toLowerCase().includes('already registered');
          setPasswordError(error.message);
          void handleError(error, {
            toastMessage: `${STRINGS.ACCOUNT_CREATION_FAILED}. ${error.message}`,
            analyticsEventName: 'Sign_Up_Error',
            captureSentry: !isAlreadyRegistered,
            sentrySeverity: 'error',
          });
          return;
        }

        // Check if email confirmation is disabled (session created immediately)
        const hasImmediateSession = !!data.session;

        // CRITICAL: Show toast immediately before any async operations that might unmount component
        successFeedback();

        // If session exists, user is auto-confirmed and can be logged in
        if (hasImmediateSession) {
          showSuccessToast(STRINGS.SIGN_UP_WELCOME, 5000);
          // Navigate to library after brief delay to show toast
          // Store ref for cleanup on unmount to prevent navigation race conditions
          navigationTimeoutRef.current = setTimeout(() => {
            router.replace(ROUTE_PATHS.EXPLORE_TAB);
          }, 1000);
        } else {
          // Email confirmation required
          showSuccessToast(STRINGS.CHECK_EMAIL_CONFIRMATION, 5000);
        }

        // Analytics can happen asynchronously without blocking UX
        if (data.user) {
          analytics
            .identify(data.user.id, {
              email: data.user.email,
              created_at: new Date().toISOString(),
            })
            .catch(() => {
              // Silent failure for analytics
            });
        }
        analytics.trackSignUp('email').catch(() => {
          // Silent failure for analytics
        });
        metaEvents.logSignUp('email');
      },
      {
        toastMessage: `${STRINGS.ACCOUNT_CREATION_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Sign_Up_Error',
        fieldError: STRINGS.PLEASE_TRY_AGAIN,
      },
    );
  }, [email, password, validateEmail, validatePassword, runAuthRequest]);

  const resetPassword = useCallback(async (): Promise<void> => {
    const isEmailValid = validateEmail(email);
    if (!isEmailValid) {
      // Show inline error (already set by validateEmail) and toast message
      // This is expected user validation, not a system error
      void handleError(new Error('Invalid email'), {
        toastMessage: email ? STRINGS.ENTER_VALID_EMAIL : STRINGS.ERROR_EMPTY_EMAIL,
        analyticsEventName: 'Password_Reset_Invalid_Email',
        captureSentry: false, // Don't log user validation errors to Sentry
        trackAnalytics: false, // Don't track expected validation errors
        showToast: true, // Show toast in addition to inline error for clarity
      });
      return;
    }

    await runAuthRequest(
      async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'open-arabic://reset-password',
        });

        if (error) {
          // Supabase rate limiting is expected user behavior (spamming reset button), not a system error
          const isRateLimit = error.message.includes('you can only request this after');
          if (!isRateLimit) {
            Sentry.captureException(error, {
              tags: { location: 'password_reset' },
              level: 'warning',
            });
          }
          void handleError(error, {
            toastMessage: isRateLimit ? STRINGS.PLEASE_TRY_AGAIN : STRINGS.RESET_PASSWORD_ERROR,
            analyticsEventName: 'Password_Reset_Error',
            captureSentry: false, // Already handled above or skipped for rate limits
            sentrySeverity: 'warning',
          });
          return;
        }

        // No mount check: the email has been sent, and saying so must not
        // depend on the form still being on screen. Long-lasting (5 s).
        showSuccessToast(STRINGS.RESET_PASSWORD_EMAIL_SENT, 5000);
      },
      {
        toastMessage: STRINGS.RESET_PASSWORD_ERROR,
        analyticsEventName: 'Password_Reset_Error',
      },
    );
  }, [email, validateEmail, runAuthRequest]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    emailError,
    passwordError,
    validateEmail,
    validatePassword,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
  };
}
