import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TextInputInstance } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedInput } from '@/components/primitives/ThemedInput';
import { ThemedText } from '@/components/primitives/ThemedText';
import { KEYBOARD_AWARE_SCROLL_PROPS, ThemedView } from '@/components/primitives/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { PASSWORD_REQUIREMENTS } from '@/hooks/auth/useAuthForm';
import { supabase } from '@/services/supabase';
import { handleError, showSuccessToast } from '@/utils/errorHandling';
import { successFeedback } from '@/utils/haptics';

/**
 * Password Reset Screen
 * Handles password reset flow when user clicks reset link from email
 */
export default function ResetPasswordScreen(): JSX.Element {
  const router = useRouter();
  // The link's own query string, as Expo Router routed it here. Read from the
  // route rather than `Linking.getInitialURL()`, which only ever returns the URL
  // that cold-launched the app — so a link tapped while the app was already
  // running (the usual case: "Forgot password", switch to Mail, tap the link)
  // was never read, and the screen bounced to /auth as "invalid or expired".
  const { token, type } = useLocalSearchParams<{ token?: string; type?: string }>();
  const confirmPasswordRef = useRef<TextInputInstance>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  // Handle password reset link and verify session
  useEffect(() => {
    const handleResetLink = async () => {
      try {
        if (token && type === 'recovery') {
          // Verify the OTP token to establish a session
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery',
          });

          if (error) {
            void handleError(error, {
              toastMessage: STRINGS.RESET_PASSWORD_LINK_INVALID,
              showToast: true,
            });
            router.replace(ROUTE_PATHS.AUTH);
            return;
          }

          // Session established successfully
          setIsValidSession(true);
          return;
        }

        // If no URL or tokens, check if there's already a valid session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsValidSession(true);
        } else {
          // No session and no valid reset link
          void handleError(new Error('Invalid or expired reset link'), {
            toastMessage: STRINGS.RESET_PASSWORD_LINK_INVALID,
            showToast: true,
          });
          router.replace(ROUTE_PATHS.AUTH);
        }
      } catch (error) {
        void handleError(error, {
          toastMessage: STRINGS.RESET_PASSWORD_LINK_VERIFY_FAILED,
          showToast: true,
        });
        router.replace(ROUTE_PATHS.AUTH);
      }
    };

    void handleResetLink();
  }, [router, token, type]);

  const validatePassword = useCallback((value: string): boolean => {
    if (!value) {
      setPasswordError(STRINGS.ENTER_PASSWORD);
      return false;
    }
    if (value.length < PASSWORD_REQUIREMENTS.minLength) {
      setPasswordError(
        STRINGS.PASSWORD_USE_AT_LEAST_TEMPLATE.replace(
          '{minLength}',
          PASSWORD_REQUIREMENTS.minLength.toString(),
        ),
      );
      return false;
    }
    setPasswordError('');
    return true;
  }, []);

  const validateConfirmPassword = useCallback(
    (value: string): boolean => {
      if (!value) {
        setConfirmPasswordError(STRINGS.RESET_PASSWORD_CONFIRM_ERROR);
        return false;
      }
      if (value !== password) {
        setConfirmPasswordError(STRINGS.RESET_PASSWORD_MISMATCH);
        return false;
      }
      setConfirmPasswordError('');
      return true;
    },
    [password],
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (passwordError) validatePassword(text);
    },
    [passwordError, validatePassword],
  );

  const handleConfirmPasswordChange = useCallback(
    (text: string) => {
      setConfirmPassword(text);
      if (confirmPasswordError) validateConfirmPassword(text);
    },
    [confirmPasswordError, validateConfirmPassword],
  );

  const handlePasswordBlur = useCallback(() => {
    if (password) validatePassword(password);
  }, [password, validatePassword]);

  const handleConfirmPasswordBlur = useCallback(() => {
    if (confirmPassword) validateConfirmPassword(confirmPassword);
  }, [confirmPassword, validateConfirmPassword]);

  const handleTogglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleToggleConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  const handleResetPassword = useCallback(async () => {
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isPasswordValid || !isConfirmPasswordValid) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        void handleError(error, {
          toastMessage: `Password reset failed. ${error.message}`,
          analyticsEventName: 'Password_Reset_Error',
          sentrySeverity: 'error',
          showToast: true,
        });
      } else {
        successFeedback();
        showSuccessToast(
          'Password reset successfully! You can now sign in with your new password.',
        );
        router.replace(ROUTE_PATHS.EXPLORE_TAB);
      }
    } catch (err) {
      void handleError(err instanceof Error ? err : new Error('Password reset error'), {
        toastMessage: 'Password reset failed. Please try again.',
        analyticsEventName: 'Password_Reset_Error',
        sentrySeverity: 'error',
        showToast: true,
      });
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword, validatePassword, validateConfirmPassword, router]);

  // Show loading while verifying session
  if (!isValidSession) {
    return (
      <ThemedView useSafeArea={true} style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <View style={styles.loadingContainer}>
          <ThemedText type="body">{STRINGS.RESET_PASSWORD_VERIFYING}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      scrollable
      useSafeArea={true}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={KEYBOARD_AWARE_SCROLL_PROPS}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ThemedText align="center" type="heading1" colorName="headingText">
            {STRINGS.RESET_PASSWORD_TITLE}
          </ThemedText>
          <ThemedText align="center" type="body" colorName="secondaryText" style={styles.subtitle}>
            {STRINGS.RESET_PASSWORD_SUBTITLE}
          </ThemedText>
        </View>

        {/* Input Fields */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputWrapper}>
            <ThemedInput
              autoCapitalize="none"
              autoComplete="password-new"
              error={passwordError}
              icon="lock-closed"
              importantForAutofill="yes"
              placeholder={STRINGS.RESET_PASSWORD_NEW_PLACEHOLDER}
              returnKeyType="next"
              submitBehavior="submit"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              rightIconAccessibilityLabel={
                showPassword ? STRINGS.HIDE_PASSWORD : STRINGS.SHOW_PASSWORD
              }
              secureTextEntry={!showPassword}
              textAlignVertical="center"
              textContentType="newPassword"
              value={password}
              testID="new-password-input"
              accessibilityLabel="New password"
              accessibilityHint="Enter a password with at least 8 characters"
              onBlur={handlePasswordBlur}
              onChangeText={handlePasswordChange}
              onRightIconPress={handleTogglePassword}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
          </View>

          <View style={styles.inputWrapper}>
            <ThemedInput
              ref={confirmPasswordRef}
              autoCapitalize="none"
              autoComplete="password-new"
              error={confirmPasswordError}
              icon="lock-closed"
              importantForAutofill="yes"
              placeholder={STRINGS.RESET_PASSWORD_CONFIRM_PLACEHOLDER}
              returnKeyType="done"
              rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
              rightIconAccessibilityLabel={
                showConfirmPassword ? STRINGS.HIDE_PASSWORD : STRINGS.SHOW_PASSWORD
              }
              secureTextEntry={!showConfirmPassword}
              textAlignVertical="center"
              textContentType="newPassword"
              value={confirmPassword}
              testID="confirm-password-input"
              accessibilityLabel="Confirm password"
              accessibilityHint="Re-enter your new password"
              onBlur={handleConfirmPasswordBlur}
              onChangeText={handleConfirmPasswordChange}
              onRightIconPress={handleToggleConfirmPassword}
              onSubmitEditing={() => void handleResetPassword()}
            />
          </View>

          <ThemedButton
            disabled={loading}
            loading={loading}
            fullWidth
            style={styles.button}
            title={STRINGS.RESET_PASSWORD_BUTTON}
            testID="reset-password-button"
            accessibilityLabel="Reset password"
            onPress={() => void handleResetPassword()}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
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
  inputsContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    maxWidth: 400,
    width: '90%',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: LAYOUT.SPACING.XXLARGE,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
