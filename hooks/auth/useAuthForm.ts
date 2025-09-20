import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

/**
 * Email validation regex and password requirements
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /\d/,
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
}

/**
 * Hook handling authentication form logic
 */
export function useAuthForm(): UseAuthFormReturn {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true);

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const validateEmail = useCallback((value: string) => {
    if (!value) return false;
    if (!EMAIL_REGEX.test(value)) {
      if (isMountedRef.current) setEmailError(STRINGS.ENTER_VALID_EMAIL);
      return false;
    }
    if (isMountedRef.current) setEmailError('');
    return true;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) {
      if (isMountedRef.current) setPasswordError(STRINGS.ENTER_PASSWORD);
      return false;
    }
    if (value.length < PASSWORD_REQUIREMENTS.minLength) {
      if (isMountedRef.current)
        setPasswordError(
          STRINGS.PASSWORD_USE_AT_LEAST_TEMPLATE.replace(
            '{minLength}',
            PASSWORD_REQUIREMENTS.minLength.toString()
          )
        );
      return false;
    }
    if (
      !PASSWORD_REQUIREMENTS.hasUpperCase.test(value) ||
      !PASSWORD_REQUIREMENTS.hasLowerCase.test(value) ||
      !PASSWORD_REQUIREMENTS.hasNumber.test(value)
    ) {
      if (isMountedRef.current) setPasswordError(STRINGS.PASSWORD_ADD_CHARACTER_TYPES);
      return false;
    }
    if (isMountedRef.current) setPasswordError('');
    return true;
  }, []);

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
        Alert.alert(STRINGS.SIGN_IN_FAILED, error.message);
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
      Alert.alert(STRINGS.SIGN_IN_FAILED, STRINGS.PLEASE_TRY_AGAIN);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword]);

  const signUpWithEmail = useCallback(async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        if (!isMountedRef.current) return;
        Alert.alert(STRINGS.ACCOUNT_CREATION_FAILED, error.message);
      } else {
        if (data?.user) {
          await analytics.identify(data.user.id, {
            email: data.user.email,
            created_at: new Date().toISOString(),
          });
        }
        await analytics.trackSignUp('email');
        successFeedback();
        if (!isMountedRef.current) return;
        Alert.alert(STRINGS.ACCOUNT_CREATED, STRINGS.CHECK_EMAIL_CONFIRMATION);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      Alert.alert(STRINGS.ACCOUNT_CREATION_FAILED, STRINGS.PLEASE_TRY_AGAIN);
      handleError(err as Error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword]);

  const toggleMode = useCallback(() => {
    setIsRegistering(!isRegistering);
    setEmailError('');
    setPasswordError('');
  }, [isRegistering]);

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
  };
}
