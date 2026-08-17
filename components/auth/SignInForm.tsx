import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthEmailInput, AuthPasswordInput } from './AuthFormInputs';
import { AuthSwitchPrompt } from './AuthSwitchPrompt';
import { ThemedButton } from '@/components/ThemedButton';
import { TextLink } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuthFormFields } from '@/hooks/auth/useAuthFormFields';

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
    password,
    loading,
    emailError,
    passwordError,
    signInWithEmail,
    resetPassword,
    passwordInputRef,
    focusPasswordInput,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
  } = useAuthFormFields();

  const handleForgotPassword = useCallback(async () => {
    await resetPassword();
  }, [resetPassword]);

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

      <AuthSwitchPrompt
        prompt={STRINGS.DONT_HAVE_ACCOUNT}
        label={STRINGS.CREATE_ACCOUNT}
        accessibilityLabel="Go to create account"
        testID="navigate-to-sign-up-link"
        onPress={handleCreateAccount}
      />
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
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
