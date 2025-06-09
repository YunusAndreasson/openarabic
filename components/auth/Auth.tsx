import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

/**
 * Email validation regex and password requirements
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /\d/,
} as const;

/**
 * Authentication component that handles both sign in and sign up
 */
function Auth(): JSX.Element {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true); // Default to create account

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Mount tracking to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Initialize auth session on component mount to ensure token refresh
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        // First, check AsyncStorage access
        try {
          await AsyncStorage.getItem('auth-test-key');
        } catch (storageErr) {
          handleError(
            storageErr instanceof Error
              ? storageErr
              : new Error('AsyncStorage error in Auth component'),
            { showToast: false, sentrySeverity: 'warning' }
          );
          // Wait a moment before trying again
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!isMounted) return;

        // Clear any potentially corrupted tokens if auth is consistently failing

        await supabase.auth.initialize();

        // Ensure auto-refresh is active to maintain the session
        supabase.auth.startAutoRefresh();

        if (!isMounted) return;

        // Try to refresh the token immediately to ensure we have a valid session
        const { error } = await supabase.auth.refreshSession();
        if (error && error.message !== 'No current session') {
          handleError(error, {
            analyticsEventName: 'Session_Refresh_Error',
            showToast: false,
            sentrySeverity: 'warning',
          });
        }
      } catch (err) {
        if (!isMounted) return;
        handleError(err instanceof Error ? err : new Error('Failed to initialize auth'));
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
      // Don't stop autoRefresh on unmount to keep session alive
    };
  }, []);

  // Validation handlers
  const validateEmail = useCallback((email: string) => {
    if (!email) return false;
    if (!EMAIL_REGEX.test(email)) {
      if (isMountedRef.current) setEmailError('Invalid email address');
      return false;
    }
    if (isMountedRef.current) setEmailError('');
    return true;
  }, []);

  const validatePassword = useCallback((password: string) => {
    if (!password) {
      if (isMountedRef.current) setPasswordError('Password is required');
      return false;
    }
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
      if (isMountedRef.current)
        setPasswordError(`Must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
      return false;
    }
    if (
      !PASSWORD_REQUIREMENTS.hasUpperCase.test(password) ||
      !PASSWORD_REQUIREMENTS.hasLowerCase.test(password) ||
      !PASSWORD_REQUIREMENTS.hasNumber.test(password)
    ) {
      if (isMountedRef.current) setPasswordError('Include upper, lower & number');
      return false;
    }
    if (isMountedRef.current) setPasswordError('');
    return true;
  }, []);

  // Input handlers
  const handleEmailChange = useCallback(
    (text: string) => {
      if (!isMountedRef.current) return;
      setEmail(text);
      if (emailError) validateEmail(text);
    },
    [emailError, validateEmail]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      if (!isMountedRef.current) return;
      setPassword(text);
      if (passwordError) validatePassword(text);
    },
    [passwordError, validatePassword]
  );

  const handleEmailBlur = useCallback(() => {
    if (email) validateEmail(email);
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    if (password) validatePassword(password);
  }, [password, validatePassword]);

  // Authentication handlers
  const signInWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    if (!isMountedRef.current) return;
    setLoading(true);
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Starting sign in process',
      level: 'info',
    });

    try {
      // Initialize auth to ensure storage is loaded
      await supabase.auth.initialize();

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
        Alert.alert('Error', error.message);
      } else {
        // Ensure auto-refresh is active
        supabase.auth.startAutoRefresh();

        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Sign in successful',
          level: 'info',
        });

        // Track successful sign in and identify user in Mixpanel
        await analytics.identify(data.user.id, {
          email: data.user.email,
          last_sign_in: new Date().toISOString(),
        });
        await analytics.trackSignIn('email');

        // Provide haptic feedback on successful login
        successFeedback();

        // Redirect to main app immediately
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: 'Redirecting to main app after successful login',
          level: 'info',
        });
        router.replace('/(tabs)/read');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      handleError(err instanceof Error ? err : new Error('Sign in error'), {
        toastMessage: 'Failed to sign in. Please try again.',
        analyticsEventName: 'Sign_In_Error',
        sentrySeverity: 'error',
      });
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, validateEmail, validatePassword]);

  const signUpWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      // Initialize auth to ensure storage is loaded
      await supabase.auth.initialize();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (!isMountedRef.current) return;
        Alert.alert('Error', error.message);
      } else {
        // Ensure auto-refresh is active
        supabase.auth.startAutoRefresh();

        // Track successful sign up and identify user in Mixpanel
        if (data?.user) {
          await analytics.identify(data.user.id, {
            email: data.user.email,
            created_at: new Date().toISOString(),
          });
        }
        await analytics.trackSignUp('email');

        // Provide haptic feedback on successful account creation
        successFeedback();

        if (!isMountedRef.current) return;
        Alert.alert('Success', 'Check your email for the confirmation link');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      Alert.alert('Error', 'Failed to create account. Please try again.');
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

  return (
    <View style={styles.container}>
      <View style={styles.inputsButtonGroup}>
        <View style={styles.inputWrapper}>
          <ThemedInput
            autoCapitalize="none"
            autoComplete="email"
            error={emailError}
            icon="mail-outline"
            importantForAutofill="yes"
            keyboardType="email-address"
            placeholder="Your email"
            returnKeyType="next"
            textAlignVertical="center"
            textContentType="emailAddress"
            value={email}
            onBlur={handleEmailBlur}
            onChangeText={handleEmailChange}
          />
        </View>

        <View style={styles.inputWrapper}>
          <ThemedInput
            autoCapitalize="none"
            autoComplete={isRegistering ? 'password-new' : 'password'}
            error={passwordError}
            icon="lock-closed-outline"
            importantForAutofill="yes"
            placeholder="Your password"
            returnKeyType="done"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            secureTextEntry={!showPassword}
            textAlignVertical="center"
            textContentType={isRegistering ? 'newPassword' : 'password'}
            value={password}
            hint={
              isRegistering
                ? `${PASSWORD_REQUIREMENTS.minLength}+ chars with upper, lower & number`
                : undefined
            }
            onBlur={handlePasswordBlur}
            onChangeText={handlePasswordChange}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />
        </View>

        <ThemedButton
          disabled={loading}
          loading={loading}
          style={styles.button}
          title={isRegistering ? 'Create Account' : 'Sign In'}
          onPress={isRegistering ? signUpWithEmail : signInWithEmail}
        />
      </View>

      <TouchableOpacity
        accessibilityHint="Toggle between sign in and sign up modes"
        accessibilityLabel={isRegistering ? 'Switch to sign in' : 'Switch to create account'}
        accessibilityRole="button"
        activeOpacity={0.7}
        style={styles.toggleContainer}
        onPress={toggleMode}
      >
        <ThemedText align="center" type="body" variant="secondary">
          {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    width: '100%',
  },
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  inputsButtonGroup: {
    marginBottom: LAYOUT.SPACING.XLARGE,
    maxWidth: 400,
    width: '100%',
  },
  toggleContainer: {
    maxWidth: 400,
    width: '100%',
  },
});

export default memo(Auth);
