import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LegalLinks } from '@/components/auth/LegalLinks';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuthForm } from '@/hooks/auth/useAuthForm';

/**
 * Authentication component that handles both sign in and sign up
 */
export function Auth(): JSX.Element {
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
    isRegistering,
    validateEmail,
    validatePassword,
    signInWithEmail,
    signUpWithEmail,
    toggleMode,
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

  return (
    <View style={styles.container}>
      {/* Header with dynamic subtitle based on mode */}
      <View style={styles.headerContainer}>
        <ThemedText align="center" type="heading1" colorName="headingText">
          {STRINGS.WELCOME_TITLE}
        </ThemedText>
        <ThemedText align="center" type="body" variant="secondary" style={styles.subtitle}>
          {isRegistering ? STRINGS.WELCOME_SUBTITLE_CREATE : STRINGS.WELCOME_SUBTITLE}
        </ThemedText>
      </View>

      {/* Social Authentication Buttons */}
      <SocialAuthButtons />

      <View style={styles.inputsButtonGroup}>
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
            autoComplete={isRegistering ? 'password-new' : 'password'}
            error={passwordError}
            icon="lock-closed"
            importantForAutofill="yes"
            placeholder={STRINGS.YOUR_PASSWORD}
            returnKeyType="done"
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            secureTextEntry={!showPassword}
            textAlignVertical="center"
            textContentType={isRegistering ? 'newPassword' : 'password'}
            value={password}
            testID="password-input"
            accessibilityLabel="Password"
            accessibilityHint={
              isRegistering ? 'Enter a password with at least 8 characters' : 'Enter your password'
            }
            onBlur={handlePasswordBlur}
            onChangeText={handlePasswordChange}
            onRightIconPress={handleTogglePassword}
          />

          {/* Password Strength Meter - only during registration */}
          {isRegistering ? <PasswordStrengthMeter password={password} /> : null}
        </View>

        <ThemedButton
          disabled={loading}
          loading={loading}
          style={styles.button}
          title={isRegistering ? STRINGS.CREATE_ACCOUNT : STRINGS.SIGN_IN}
          testID={isRegistering ? 'create-account-button' : 'sign-in-button'}
          accessibilityLabel={isRegistering ? 'Create account' : 'Sign in'}
          onPress={isRegistering ? signUpWithEmail : signInWithEmail}
        />

        {/* Forgot Password Link - always rendered to prevent layout shift, but hidden during signup */}
        <View style={styles.forgotPasswordContainer}>
          {!isRegistering ? (
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
          ) : null}
        </View>

        {/* Mode Toggle - Secondary action at bottom */}
        <View style={styles.modeToggleContainer}>
          <ThemedText type="body" variant="secondary">
            {isRegistering ? STRINGS.ALREADY_HAVE_ACCOUNT : STRINGS.DONT_HAVE_ACCOUNT}{' '}
          </ThemedText>
          <TouchableOpacity
            activeOpacity={LAYOUT.OPACITY.HIGH}
            testID="toggle-auth-mode-button"
            accessibilityRole="button"
            accessibilityLabel={isRegistering ? 'Switch to sign in' : 'Switch to create account'}
            onPress={toggleMode}
          >
            <ThemedText type="body" colorName="tint" weight="semibold">
              {isRegistering ? STRINGS.SIGN_IN : STRINGS.CREATE_ACCOUNT}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal Links */}
      <LegalLinks />
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
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    minHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE + LAYOUT.SPACING.MEDIUM, // Reserve space for text + margin
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
    marginTop: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  inputsButtonGroup: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    maxWidth: SCREEN_WIDTH * 0.9,
    width: '100%',
  },
  modeToggleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
