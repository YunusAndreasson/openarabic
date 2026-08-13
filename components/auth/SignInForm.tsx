import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useRef } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AuthEmailInput, AuthPasswordInput } from './AuthFormInputs';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { TextLink } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
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
  const passwordInputRef = useRef<TextInput>(null);

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

  const focusPasswordInput = useCallback(() => {
    passwordInputRef.current?.focus();
  }, []);

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
    router.push(ROUTE_PATHS.AUTH_SIGN_UP);
  }, []);

  return (
    <View style={styles.container}>
      <AuthEmailInput
        value={email}
        onChangeText={handleEmailChange}
        onBlur={handleEmailBlur}
        onSubmitEditing={focusPasswordInput}
        error={emailError}
      />

      <AuthPasswordInput
        value={password}
        onChangeText={handlePasswordChange}
        onBlur={handlePasswordBlur}
        onSubmitEditing={signInWithEmail}
        error={passwordError}
        inputRef={passwordInputRef}
      />

      <ThemedButton
        disabled={loading}
        loading={loading}
        fullWidth
        style={styles.button}
        title={STRINGS.SIGN_IN}
        testID="sign-in-button"
        accessibilityLabel="Sign in"
        onPress={signInWithEmail}
      />

      {/* Forgot Password Link */}
      <View style={styles.forgotPasswordContainer}>
        <TextLink
          accessibilityLabel="Forgot password"
          label={STRINGS.FORGOT_PASSWORD}
          testID="forgot-password-button"
          onPress={handleForgotPassword}
        />
      </View>

      {/* Link to Create Account */}
      <View style={styles.createAccountContainer}>
        <ThemedText type="body" colorName="secondaryText">
          {STRINGS.DONT_HAVE_ACCOUNT}{' '}
        </ThemedText>
        <TextLink
          accessibilityLabel="Go to create account"
          label={STRINGS.CREATE_ACCOUNT}
          testID="navigate-to-sign-up-link"
          type="bodyBold"
          onPress={handleCreateAccount}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: LAYOUT.SPACING.LARGE,
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
