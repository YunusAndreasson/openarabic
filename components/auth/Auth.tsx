import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { PASSWORD_REQUIREMENTS, useAuthForm } from '@/hooks/auth/useAuthForm';

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
  } = useAuthForm();

  // Input handlers
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) validateEmail(text);
    },
    [emailError, validateEmail, setEmail]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (passwordError) validatePassword(text);
    },
    [passwordError, validatePassword, setPassword]
  );

  const handleEmailBlur = useCallback(() => {
    if (email) validateEmail(email);
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    if (password) validatePassword(password);
  }, [password, validatePassword]);

  // Authentication handlers are provided by useAuthForm

  return (
    <View style={styles.container}>
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
            hint={
              isRegistering
                ? STRINGS.PASSWORD_REQUIREMENTS_HINT.replace(
                    '{minLength}',
                    PASSWORD_REQUIREMENTS.minLength.toString()
                  )
                : undefined
            }
            onBlur={handlePasswordBlur}
            onChangeText={handlePasswordChange}
            onRightIconPress={handleTogglePassword}
          />
        </View>

        <ThemedButton
          disabled={loading}
          loading={loading}
          style={styles.button}
          title={isRegistering ? STRINGS.CREATE_ACCOUNT : STRINGS.SIGN_IN}
          testID={isRegistering ? 'create-account-button' : 'sign-in-button'}
          onPress={isRegistering ? signUpWithEmail : signInWithEmail}
        />
      </View>

      <TouchableOpacity
        activeOpacity={LAYOUT.OPACITY.HIGH}
        style={styles.toggleContainer}
        testID="toggle-mode-button"
        onPress={toggleMode}
      >
        <ThemedText align="center" type="body" variant="secondary">
          {isRegistering ? STRINGS.HAVE_ACCOUNT_SIGN_IN : STRINGS.NEED_ACCOUNT_CREATE_ONE}
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
    maxWidth: SCREEN_WIDTH * 0.9, // Responsive max width (90% of screen)
    width: '100%',
  },
  toggleContainer: {
    maxWidth: SCREEN_WIDTH * 0.9, // Responsive max width (90% of screen)
    width: '100%',
  },
});

