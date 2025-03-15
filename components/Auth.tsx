import React, { useState, useCallback } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import { ThemedView } from './ThemedView';
import { ThemedInput } from './ThemedInput';
import { ThemedButton } from './ThemedButton';
import { LAYOUT } from '@/constants/layout';

/**
 * Email validation regex and password requirements
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
} as const;

/**
 * Authentication component that handles both sign in and sign up
 */
export default function Auth() {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }, [email, password, validateEmail, validatePassword]);

  const signUpWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Success', 'Check your email for the confirmation link!');
    setLoading(false);
  }, [email, password, validateEmail, validatePassword]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.inputContainer}>
        <ThemedInput
          icon="mail-outline"
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder="Email"
          keyboardType="email-address"
          returnKeyType="next"
          autoComplete="email"
          error={emailError}
        />

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
          autoComplete="password"
          error={passwordError}
          hint={`${PASSWORD_REQUIREMENTS.minLength}+ chars with upper, lower & number`}
        />
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <ThemedButton
          title="Sign In"
          onPress={signInWithEmail}
          disabled={loading}
          style={styles.button}
        />

        <ThemedButton
          variant="outlined"
          title="Create Account"
          onPress={signUpWithEmail}
          disabled={loading}
          style={styles.button}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  inputContainer: {
    width: '100%',
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  buttonContainer: {
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  button: {
    width: '100%',
  },
});
