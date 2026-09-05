import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
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
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent navigation race conditions
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const validateEmail = useCallback(
    (value: string) => {
      if (!value) {
        if (isMountedRef.current) setEmailError(STRINGS.ERROR_EMPTY_EMAIL);
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

  // supabase-js has no built-in timeout: a signIn/signUp/resetPassword call made
  // while offline hangs indefinitely on the fetch rather than rejecting, leaving
  // the button stuck in a loading state with no way to recover short of leaving
  // the screen. Checking reachability first (same pattern as refreshSession in
  // useProvideAuth) fails fast with a visible error instead.
  //
  // Fails OPEN, deliberately. This is a courtesy pre-flight, not an
  // authorization gate — its only job is to turn a guaranteed hang into a fast,
  // visible error, so it must never be able to block an attempt that would have
  // worked. Two ways the naive version did exactly that:
  //
  // - `isConnected` is `boolean | null`, and null means UNKNOWN, not offline.
  //   Truthiness-testing it told a connected user on a platform reporting null
  //   that they had no internet.
  // - If `NetInfo.fetch()` rejects or the native module is missing, the throw
  //   escaped from here straight out of signInWithEmail — the call sits OUTSIDE
  //   that function's try block — so the button silently did nothing at all and
  //   sign-in was impossible. Strictly worse than the hang this prevents.
  //
  // So: only a definitive `false` counts as offline. Anything else proceeds and
  // lets the real request decide.
  const checkNetworkConnected = useCallback(async (): Promise<boolean> => {
    let isDefinitelyOffline = false;
    try {
      const netState = await NetInfo.fetch();
      isDefinitelyOffline = netState?.isConnected === false;
    } catch {
      isDefinitelyOffline = false;
    }

    if (!isDefinitelyOffline) return true;

    if (isMountedRef.current) setPasswordError(STRINGS.NO_INTERNET_CONNECTION);
    void handleError(new Error('No network connection available'), {
      toastMessage: STRINGS.NO_INTERNET_CONNECTION,
      analyticsEventName: 'Auth_No_Network',
      captureSentry: false,
      trackAnalytics: false,
      showToast: true,
    });
    return false;
  }, [isMountedRef]);

  const signInWithEmail = useCallback(async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    if (!(await checkNetworkConnected())) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (!isMountedRef.current) return;
        // Show inline error so it's visible even when auth screen overlays the toast
        setPasswordError(error.message);
        void handleError(error, {
          toastMessage: `${STRINGS.SIGN_IN_FAILED}. ${error.message}`,
          analyticsEventName: 'Sign_In_Error',
          sentrySeverity: 'error',
        });
      } else {
        await analytics.identify(data.user.id, {
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('email');
        successFeedback();
        router.replace(ROUTE_PATHS.EXPLORE_TAB);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setPasswordError(STRINGS.PLEASE_TRY_AGAIN);
      void handleError(err instanceof Error ? err : new Error('Sign in error'), {
        toastMessage: `${STRINGS.SIGN_IN_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Sign_In_Error',
        sentrySeverity: 'error',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword, isMountedRef, checkNetworkConnected]);

  const signUpWithEmail = useCallback(async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    if (!(await checkNetworkConnected())) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        if (!isMountedRef.current) return;
        // "User already registered" is expected user behavior, not a system error
        const isAlreadyRegistered = error.message?.toLowerCase().includes('already registered');
        setPasswordError(error.message);
        void handleError(error, {
          toastMessage: `${STRINGS.ACCOUNT_CREATION_FAILED}. ${error.message}`,
          analyticsEventName: 'Sign_Up_Error',
          captureSentry: !isAlreadyRegistered,
          sentrySeverity: 'error',
        });
      } else {
        // Check if email confirmation is disabled (session created immediately)
        const hasImmediateSession = !!data?.session;

        // CRITICAL: Show toast immediately before any async operations that might unmount component
        successFeedback();

        // If session exists, user is auto-confirmed and can be logged in
        if (hasImmediateSession) {
          showSuccessToast(`${STRINGS.WELCOME_TITLE}! Let's start learning.`, 5000);
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
        if (data?.user) {
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
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setPasswordError(STRINGS.PLEASE_TRY_AGAIN);
      void handleError(err instanceof Error ? err : new Error('Sign up error'), {
        toastMessage: `${STRINGS.ACCOUNT_CREATION_FAILED}. ${STRINGS.PLEASE_TRY_AGAIN}`,
        analyticsEventName: 'Sign_Up_Error',
        sentrySeverity: 'error',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword, isMountedRef, checkNetworkConnected]);

  const toggleMode = useCallback(() => {
    setIsRegistering(!isRegistering);
    setEmailError('');
    setPasswordError('');
  }, [isRegistering]);

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

    if (!(await checkNetworkConnected())) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'open-arabic://reset-password',
      });

      if (error) {
        if (!isMountedRef.current) return;
        // Supabase rate limiting is expected user behavior (spamming reset button), not a system error
        const isRateLimit = error.message?.includes('you can only request this after');
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
      } else {
        if (!isMountedRef.current) return;
        // Show long-lasting success toast (5 seconds)
        showSuccessToast(STRINGS.RESET_PASSWORD_EMAIL_SENT, 5000);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      void handleError(err instanceof Error ? err : new Error('Password reset error'), {
        toastMessage: STRINGS.RESET_PASSWORD_ERROR,
        analyticsEventName: 'Password_Reset_Error',
        sentrySeverity: 'error',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, validateEmail, isMountedRef, checkNetworkConnected]);

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
