import type { RefObject } from 'react';
import { useCallback, useState } from 'react';
import type { TextInput } from 'react-native';
import { View, StyleSheet } from 'react-native';

import { ThemedInput } from '@/components/ThemedInput';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

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
  inputRef?: RefObject<TextInput | null>;
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
export function AuthEmailInput({
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
export function AuthPasswordInput({
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
        secureTextEntry={!showPassword}
        textAlignVertical="center"
        textContentType={isSignUp ? 'newPassword' : 'password'}
        value={value}
        testID={testID}
        accessibilityLabel="Password"
        accessibilityHint={
          isSignUp ? 'Enter a password with at least 8 characters' : 'Enter your password'
        }
        onBlur={onBlur}
        onChangeText={onChangeText}
        onRightIconPress={handleTogglePassword}
        onSubmitEditing={onSubmitEditing}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
