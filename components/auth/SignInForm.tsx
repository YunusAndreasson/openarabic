import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
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
  const [showPassword, setShowPassword] = useState(false);
  const handleTogglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

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
      <View style={styles.inputWrapper}>
        <ThemedInput
          autoCapitalize="none"
          autoComplete="email"
          error={emailError}
          icon="mail"
          importantForAutofill="yes"
          keyboardType="email-address"
          placeholder={STRINGS.YOUR_EMAIL}
          returnKeyType="next"
          textAlignVertical="center"
          textContentType="emailAddress"
          value={email}
          testID="email-input"
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email address"
          onBlur={handleEmailBlur}
          onChangeText={handleEmailChange}
        />
      </View>

      <View style={styles.inputWrapper}>
        <ThemedInput
          autoCapitalize="none"
          autoComplete="password"
          error={passwordError}
          icon="lock-closed"
          importantForAutofill="yes"
          placeholder={STRINGS.YOUR_PASSWORD}
          returnKeyType="done"
          rightIcon={showPassword ? 'eye-off' : 'eye'}
          secureTextEntry={!showPassword}
          textAlignVertical="center"
          textContentType="password"
          value={password}
          testID="password-input"
          accessibilityLabel="Password"
          accessibilityHint="Enter your password"
          onBlur={handlePasswordBlur}
          onChangeText={handlePasswordChange}
          onRightIconPress={handleTogglePassword}
        />
      </View>

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
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
