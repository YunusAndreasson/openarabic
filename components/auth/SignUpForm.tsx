import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { STRINGS } from '@/constants/strings';
import { useAuthForm } from '@/hooks/auth/useAuthForm';

/**
 * Sign Up Form Component
 *
 * Dedicated form for creating a new account with email and password.
 * Used on the /auth/sign-up screen.
 *
 * Features:
 * - Email and password inputs with validation
 * - Password strength meter
 * - Link to sign in screen
 * - Loading states
 * - Error handling
 */
export function SignUpForm(): JSX.Element {
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
    signUpWithEmail,
  } = useAuthForm();

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

  const handleSignIn = useCallback(() => {
    router.push('/auth/sign-in');
  }, []);

  const handleCreateAccount = useCallback(() => {
    signUpWithEmail();
  }, [signUpWithEmail]);

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
          autoComplete="password-new"
          error={passwordError}
          icon="lock-closed"
          importantForAutofill="yes"
          placeholder={STRINGS.YOUR_PASSWORD}
          returnKeyType="done"
          rightIcon={showPassword ? 'eye-off' : 'eye'}
          secureTextEntry={!showPassword}
          textAlignVertical="center"
          textContentType="newPassword"
          value={password}
          testID="password-input"
          accessibilityLabel="Password"
          accessibilityHint="Enter a password with at least 8 characters"
          onBlur={handlePasswordBlur}
          onChangeText={handlePasswordChange}
          onRightIconPress={handleTogglePassword}
        />

        {/* Password Strength Meter */}
        <PasswordStrengthMeter password={password} />
      </View>

      <ThemedButton
        disabled={loading}
        loading={loading}
        style={styles.button}
        title={STRINGS.CREATE_ACCOUNT}
        testID="create-account-button"
        accessibilityLabel="Create account"
        onPress={handleCreateAccount}
      />

      {/* Link to Sign In */}
      <View style={styles.signInContainer}>
        <ThemedText type="body" variant="secondary">
          {STRINGS.ALREADY_HAVE_ACCOUNT}{' '}
        </ThemedText>
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HIGH}
          testID="navigate-to-sign-in-link"
          accessibilityRole="button"
          accessibilityLabel="Go to sign in"
          onPress={handleSignIn}
        >
          <ThemedText type="body" colorName="tint" weight="semibold">
            {STRINGS.SIGN_IN}
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
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  signInContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
});
