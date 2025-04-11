import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
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
 * Authentication component props
 */
interface AuthProps {
  /** Disable loading indicators */
  disableLoading?: boolean;
}

/**
 * Authentication component that handles both sign in and sign up
 */
export default function Auth({ disableLoading = false }: AuthProps): JSX.Element {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true); // Default to create account

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      // Track successful sign in and identify user in Mixpanel
      await analytics.identify(data.user.id, {
        email: data.user.email,
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn('email');

      // Provide haptic feedback on successful login
      lightFeedback();

      // Redirect to main app immediately
      router.replace('/(tabs)');
    }
    setLoading(false);
  }, [email, password, validateEmail, validatePassword]);

  const signUpWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) Alert.alert('Error', error.message);
    else {
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
    setLoading(false);
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
          loading={disableLoading ? false : loading}
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
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.TINY,
    width: '100%',
  },
  inputsButtonGroup: {
    marginBottom: LAYOUT.SPACING.SMALL,
    maxWidth: 400,
    width: '100%',
  },
  toggleContainer: {
    maxWidth: 400,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
});
