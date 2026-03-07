import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useRef } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AuthEmailInput, AuthPasswordInput } from './AuthFormInputs';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
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
    signUpWithEmail,
  } = useAuthForm();

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

  const handleSignIn = useCallback(() => {
    router.push(ROUTE_PATHS.AUTH_SIGN_IN);
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
        onSubmitEditing={signUpWithEmail}
        error={passwordError}
        isSignUp
        inputRef={passwordInputRef}
      >
        <PasswordStrengthMeter password={password} />
      </AuthPasswordInput>

      <ThemedButton
        disabled={loading}
        loading={loading}
        style={styles.button}
        title={STRINGS.CREATE_ACCOUNT}
        testID="create-account-button"
        accessibilityLabel="Create account"
        onPress={signUpWithEmail}
      />

      {/* Link to Sign In */}
      <View style={styles.signInContainer}>
        <ThemedText type="body" variant="secondary">
          {STRINGS.ALREADY_HAVE_ACCOUNT}{' '}
        </ThemedText>
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HIGH}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
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
  signInContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
});
