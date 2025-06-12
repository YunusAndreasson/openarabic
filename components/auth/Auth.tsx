import type { JSX } from 'react';
import React, { useState, useCallback, useEffect, memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { useAuthForm, PASSWORD_REQUIREMENTS } from '@/hooks/auth/useAuthForm';
// import { analytics } from '@/services/analytics';
// Temporary mock analytics until service is fixed
const analytics = {
  identify: async (_userId: string, _properties?: any) => {},
  trackSignIn: async (_method?: string) => {},
  trackSignUp: async (_method?: string) => {},
};

/**
 * Authentication component that handles both sign in and sign up
 */
function Auth(): JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

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

  // Initialize auth session on component mount to ensure token refresh
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        if (!isMounted) return;

        await supabase.auth.initialize();
        supabase.auth.startAutoRefresh();

        if (!isMounted) return;

        const { error } = await supabase.auth.refreshSession();
        if (error && error.message !== 'No current session') {
          handleError(error, {
            analyticsEventName: 'Session_Refresh_Error',
            showToast: false,
            sentrySeverity: 'warning',
          });
        }
      } catch (err) {
        if (!isMounted) return;
        handleError(err instanceof Error ? err : new Error('Failed to initialize auth'));
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      // Don't stop autoRefresh on unmount to keep session alive
    };
  }, []);

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
            icon="mail-outline"
            importantForAutofill="yes"
            keyboardType="email-address"
            placeholder="Your email"
            returnKeyType="next"
            textAlignVertical="center"
            textContentType="emailAddress"
            value={email}
            onBlur={handleEmailBlur}
            onChangeText={handleEmailChange}
          />
        </View>

        <View style={styles.inputWrapper}>
          <ThemedInput
            autoCapitalize="none"
            autoComplete={isRegistering ? 'password-new' : 'password'}
            error={passwordError}
            icon="lock-closed-outline"
            importantForAutofill="yes"
            placeholder="Your password"
            returnKeyType="done"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            secureTextEntry={!showPassword}
            textAlignVertical="center"
            textContentType={isRegistering ? 'newPassword' : 'password'}
            value={password}
            hint={
              isRegistering
                ? `At least ${PASSWORD_REQUIREMENTS.minLength} characters with uppercase, lowercase and number`
                : undefined
            }
            onBlur={handlePasswordBlur}
            onChangeText={handlePasswordChange}
            onRightIconPress={() => setShowPassword(!showPassword)}
          />
        </View>

        <ThemedButton
          disabled={loading}
          loading={loading}
          style={styles.button}
          title={isRegistering ? 'Create Account' : 'Sign In'}
          onPress={isRegistering ? signUpWithEmail : signInWithEmail}
        />
      </View>

      <TouchableOpacity activeOpacity={0.7} style={styles.toggleContainer} onPress={toggleMode}>
        <ThemedText align="center" type="body" variant="secondary">
          {isRegistering ? 'Have an account? Sign in' : 'Need an account? Create one'}
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
    maxWidth: 400,
    width: '100%',
  },
  toggleContainer: {
    maxWidth: 400,
    width: '100%',
  },
});

export default memo(Auth);
