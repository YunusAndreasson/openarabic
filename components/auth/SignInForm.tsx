import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AuthEmailInput, AuthPasswordInput } from './AuthFormInputs';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuthForm } from '@/hooks/auth/useAuthForm';

/**
 * Sign In Form Component
 *
 * Dedicated form for signing in with email and password.
 * Used on the /auth/sign-in screen.
 *
 * Features:
 * - Email and password inputs with validation
 * - Forgot password link
 * - Link to create account screen
 * - Loading states
 * - Error handling
 */
export function SignInForm(): JSX.Element {
  const {
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
    resetPassword,
  } = useAuthForm();

  const handleForgotPassword = useCallback(async () => {
    await resetPassword();
  }, [resetPassword]);

  // Input handlers
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) validateEmail(text);
    },
    [emailError, validateEmail, setEmail],
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (passwordError) validatePassword(text);
    },
    [passwordError, validatePassword, setPassword],
  );

  const handleEmailBlur = useCallback(() => {
    if (email) validateEmail(email);
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    if (password) validatePassword(password);
  }, [password, validatePassword]);

  const handleCreateAccount = useCallback(() => {
    router.push('/auth/sign-up');
  }, []);

  return (
    <View style={styles.container}>
      <AuthEmailInput
        value={email}
        onChangeText={handleEmailChange}
        onBlur={handleEmailBlur}
        error={emailError}
      />

      <AuthPasswordInput
        value={password}
        onChangeText={handlePasswordChange}
        onBlur={handlePasswordBlur}
        error={passwordError}
      />

      <ThemedButton
        disabled={loading}
        loading={loading}
        style={styles.button}
        title={STRINGS.SIGN_IN}
        testID="sign-in-button"
        accessibilityLabel="Sign in"
        onPress={signInWithEmail}
      />

      {/* Forgot Password Link */}
      <View style={styles.forgotPasswordContainer}>
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HIGH}
          testID="forgot-password-button"
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          onPress={handleForgotPassword}
        >
          <ThemedText type="body" colorName="tint">
            {STRINGS.FORGOT_PASSWORD}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Link to Create Account */}
      <View style={styles.createAccountContainer}>
        <ThemedText type="body" variant="secondary">
          {STRINGS.DONT_HAVE_ACCOUNT}{' '}
        </ThemedText>
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HIGH}
          testID="navigate-to-sign-up-link"
          accessibilityRole="button"
          accessibilityLabel="Go to create account"
          onPress={handleCreateAccount}
        >
          <ThemedText type="body" colorName="tint" weight="semibold">
            {STRINGS.CREATE_ACCOUNT}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  container: {
    width: '100%',
  },
  createAccountContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
