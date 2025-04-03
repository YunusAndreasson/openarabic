import React, { useState, useCallback } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/services/supabase';
import { ThemedInput } from './ThemedInput';
import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import { analytics } from '@/services/analytics';

/**
 * Email validation regex and password requirements
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
} as const;

/**
 * Authentication component that handles both sign in and sign up
 */
export default function Auth() {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Validation handlers
  const validateEmail = useCallback((email: string) => {
    if (!email) return false;
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Invalid email address');
      return false;
    }
    setEmailError('');
    return true;
  }, []);

  const validatePassword = useCallback((password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
      setPasswordError(`Must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
      return false;
    }
    if (
      !PASSWORD_REQUIREMENTS.hasUpperCase.test(password) ||
      !PASSWORD_REQUIREMENTS.hasLowerCase.test(password) ||
      !PASSWORD_REQUIREMENTS.hasNumber.test(password)
    ) {
      setPasswordError('Include upper, lower & number');
      return false;
    }
    setPasswordError('');
    return true;
  }, []);

  // Input handlers
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) validateEmail(text);
    },
    [emailError, validateEmail]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (passwordError) validatePassword(text);
    },
    [passwordError, validatePassword]
  );

  const handleEmailBlur = useCallback(() => {
    if (email) validateEmail(email);
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    if (password) validatePassword(password);
  }, [password, validatePassword]);

  // Authentication handlers
  const signInWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      // Track successful sign in and identify user in Mixpanel
      await analytics.identify(data.user.id, {
        email: data.user.email,
        last_sign_in: new Date().toISOString(),
      });
      await analytics.trackSignIn('email');
    }
    setLoading(false);
  }, [email, password, validateEmail, validatePassword]);

  const signUpWithEmail = useCallback(async () => {
    // Run both validations and store results
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) Alert.alert('Error', error.message);
    else {
      // Track successful sign up and identify user in Mixpanel
      if (data?.user) {
        await analytics.identify(data.user.id, {
          email: data.user.email,
          created_at: new Date().toISOString(),
        });
      }
      await analytics.trackSignUp('email');
      Alert.alert('Success', 'Check your email for the confirmation link!');
    }
    setLoading(false);
  }, [email, password, validateEmail, validatePassword]);

  const toggleMode = useCallback(() => {
    setIsRegistering(!isRegistering);
    setEmailError('');
    setPasswordError('');
  }, [isRegistering]);

  return (
    <View style={styles.container}>
      <ThemedText type="heading3" align="center" style={styles.formTitle}>
        {isRegistering ? 'Create Account' : 'Sign In'}
      </ThemedText>

      <View style={styles.inputsButtonGroup}>
        <View style={styles.inputWrapper}>
          <ThemedInput
            icon="mail-outline"
            value={email}
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            placeholder="Email"
            keyboardType="email-address"
            returnKeyType="next"
            autoComplete="email"
            error={emailError}
            textAlignVertical="center"
          />
        </View>

        <View style={styles.inputWrapper}>
          <ThemedInput
            icon="lock-closed-outline"
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            placeholder="Password"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            returnKeyType="done"
            autoComplete="password"
            error={passwordError}
            hint={
              isRegistering
                ? `${PASSWORD_REQUIREMENTS.minLength}+ chars with upper, lower & number`
                : undefined
            }
            textAlignVertical="center"
          />
        </View>

        <ThemedButton
          title={isRegistering ? 'Create Account' : 'Sign In'}
          onPress={isRegistering ? signUpWithEmail : signInWithEmail}
          disabled={loading}
          style={styles.button}
        />
      </View>

      <TouchableOpacity onPress={toggleMode} style={styles.toggleContainer} activeOpacity={0.7}>
        <ThemedText type="body" align="center" variant="secondary">
          {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  formTitle: {
    marginBottom: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  inputsButtonGroup: {
    width: '100%',
    maxWidth: 400,
  },
  inputWrapper: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  button: {
    width: '100%',
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  toggleContainer: {
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
    maxWidth: 400,
  },
});
