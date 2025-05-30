import { router } from 'expo-router';
import React, { useState, useCallback, JSX, useEffect, memo } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

import { LAYOUT } from '@/constants/layout';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

import { ThemedButton } from './ThemedButton';
import { ThemedInput } from './ThemedInput';
import { ThemedText } from './ThemedText';

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
      // Don't stop autoRefresh on unmount to keep session alive
    };
  }, []);

  // Validation handlers
  const validateEmail = useCallback((email: string) => {
    if (!email) return false;
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Invalid email address');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const validatePassword = useCallback((password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
      setPasswordError(`Must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
      return false;
    }
    if (
      !PASSWORD_REQUIREMENTS.hasUpperCase.test(password) ||
      !PASSWORD_REQUIREMENTS.hasLowerCase.test(password) ||
      !PASSWORD_REQUIREMENTS.hasNumber.test(password)
    ) {
      setPasswordError('Include upper, lower & number');
      return false;
    }
    setPasswordError('');
    return true;
  }, []);

  // Input handlers
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) validateEmail(text);
    },
    [emailError, validateEmail]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
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
        lightFeedback();

        // Redirect to main app immediately
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: 'Redirecting to main app after successful login',
          level: 'info',
        });
        router.replace('/(tabs)');
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Sign in error'), {
        toastMessage: 'Failed to sign in. Please try again.',
        analyticsEventName: 'Sign_In_Error',
        sentrySeverity: 'error',
      });
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, validateEmail, validatePassword]);

  const signUpWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);

    try {
      // Initialize auth to ensure storage is loaded
      await supabase.auth.initialize();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
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
        lightFeedback();

        Alert.alert('Success', 'Check your email for the confirmation link!');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create account. Please try again.');
      handleError(err as Error);
    } finally {
      setLoading(false);
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
            icon="mail-outline"
            value={email}
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            placeholder="Email"
            keyboardType="email-address"
            returnKeyType="next"
            autoComplete="email"
            autoCapitalize="none"
            textContentType="emailAddress"
            importantForAutofill="yes"
            error={emailError}
            textAlignVertical="center"
          />
        </View>

        <View style={styles.inputWrapper}>
          <ThemedInput
            icon="lock-closed-outline"
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            placeholder="Password"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            returnKeyType="done"
            autoComplete={isRegistering ? 'password-new' : 'password'}
            autoCapitalize="none"
            textContentType={isRegistering ? 'newPassword' : 'password'}
            importantForAutofill="yes"
            error={passwordError}
            hint={
              isRegistering
                ? `${PASSWORD_REQUIREMENTS.minLength}+ chars with upper, lower & number`
                : undefined
            }
            textAlignVertical="center"
          />
        </View>

        <ThemedButton
          title={isRegistering ? 'Create Account' : 'Sign In'}
          onPress={isRegistering ? signUpWithEmail : signInWithEmail}
          disabled={loading}
          loading={loading}
          style={styles.button}
        />
      </View>

      <TouchableOpacity onPress={toggleMode} style={styles.toggleContainer} activeOpacity={0.7}>
        <ThemedText type="body" align="center" variant="secondary">
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
