import type { ReactNode, RefObject } from 'react';
import { useCallback, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { View, StyleSheet } from 'react-native';

import { ThemedInput } from '@/components/primitives/ThemedInput';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { NEW_PASSWORD_ACCESSIBILITY_HINT } from '@/utils/authUtils';

interface AuthEmailInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  error?: string;
  testID?: string;
}

interface AuthPasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  error?: string;
  isSignUp?: boolean;
  testID?: string;
  inputRef?: RefObject<TextInputInstance | null>;
}

export interface AuthCredentialFieldState {
  email: string;
  password: string;
  emailError?: string;
  passwordError?: string;
  passwordInputRef: RefObject<TextInputInstance | null>;
  handleEmailChange: (text: string) => void;
  handlePasswordChange: (text: string) => void;
  handleEmailBlur: () => void;
  handlePasswordBlur: () => void;
  focusPasswordInput: () => void;
}

interface AuthCredentialFieldsProps {
  fields: AuthCredentialFieldState;
  onPasswordSubmit: () => void;
  isSignUp?: boolean;
  children?: ReactNode;
}

/**
 * Email input for auth forms with consistent configuration
 *
 * Pre-configured with:
 * - Email keyboard type
 * - Email autocomplete
 * - Mail icon
 * - Accessibility labels
 */
function AuthEmailInput({
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  error,
  testID = 'email-input',
}: AuthEmailInputProps) {
  return (
    <View style={styles.inputWrapper}>
      <ThemedInput
        autoCapitalize="none"
        autoComplete="email"
        error={error}
        icon="mail"
        importantForAutofill="yes"
        keyboardType="email-address"
        placeholder={STRINGS.YOUR_EMAIL}
        returnKeyType="next"
        textAlignVertical="center"
        textContentType="emailAddress"
        value={value}
        testID={testID}
        accessibilityLabel="Email address"
        accessibilityHint="Enter your email address"
        submitBehavior="submit"
        onBlur={onBlur}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

/**
 * Password input for auth forms with show/hide toggle
 *
 * Pre-configured with:
 * - Password autocomplete (or newPassword for sign up)
 * - Lock icon
 * - Show/hide password toggle
 * - Accessibility labels
 */
function AuthPasswordInput({
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  error,
  isSignUp = false,
  testID = 'password-input',
  inputRef,
  children,
}: AuthPasswordInputProps & { children?: React.ReactNode }) {
  const [showPassword, setShowPassword] = useState(false);
  const handleTogglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <View style={styles.inputWrapper}>
      <ThemedInput
        ref={inputRef}
        autoCapitalize="none"
        autoComplete={isSignUp ? 'password-new' : 'password'}
        error={error}
        icon="lock-closed"
        importantForAutofill="yes"
        placeholder={STRINGS.YOUR_PASSWORD}
        returnKeyType="done"
        rightIcon={showPassword ? 'eye-off' : 'eye'}
        rightIconAccessibilityLabel={showPassword ? STRINGS.HIDE_PASSWORD : STRINGS.SHOW_PASSWORD}
        secureTextEntry={!showPassword}
        textAlignVertical="center"
        textContentType={isSignUp ? 'newPassword' : 'password'}
        value={value}
        testID={testID}
        accessibilityLabel="Password"
        accessibilityHint={isSignUp ? NEW_PASSWORD_ACCESSIBILITY_HINT : 'Enter your password'}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onRightIconPress={handleTogglePassword}
        onSubmitEditing={onSubmitEditing}
      />
      {children}
    </View>
  );
}

/** The identical email/password field pair shared by both credential forms. */
export function AuthCredentialFields({
  fields,
  onPasswordSubmit,
  isSignUp = false,
  children,
}: AuthCredentialFieldsProps) {
  const {
    email,
    password,
    emailError,
    passwordError,
    passwordInputRef,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
    focusPasswordInput,
  } = fields;

  return (
    <>
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
        onSubmitEditing={onPasswordSubmit}
        error={passwordError}
        isSignUp={isSignUp}
        inputRef={passwordInputRef}
      >
        {children}
      </AuthPasswordInput>
    </>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
