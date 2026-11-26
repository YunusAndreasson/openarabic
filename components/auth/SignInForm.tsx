import type { StartReaderAuth } from '@/services/readerSaveAuth';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthCredentialFields } from './AuthFormInputs';
import { AuthSwitchPrompt } from './AuthSwitchPrompt';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { TextLink } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuthFormFields } from '@/hooks/auth/useAuthFormFields';

/**
 * Sign In Form Component
 *
 * Dedicated form for signing in with email and password.
 * Email sign-in step in the account modal.
 *
 * Features:
 * - Email and password inputs with validation
 * - Forgot password link
 * - Link to create account screen
 * - Loading states
 * - Error handling
 */
export function SignInForm({
  returnToReader = false,
  onCreateAccount,
  startAttempt,
}: {
  returnToReader?: boolean;
  onCreateAccount?: () => void;
  startAttempt?: StartReaderAuth;
} = {}): JSX.Element {
  const fields = useAuthFormFields(returnToReader, startAttempt);
  const { loading, signInWithEmail, resetPassword } = fields;

  const handleForgotPassword = useCallback(async () => {
    await resetPassword();
  }, [resetPassword]);

  return (
    <View style={styles.container}>
      <AuthCredentialFields fields={fields} onPasswordSubmit={() => void signInWithEmail()} />

      <ThemedButton
        disabled={loading}
        loading={loading}
        fullWidth
        allowTitleWrap
        style={styles.button}
        title={STRINGS.SIGN_IN}
        testID="sign-in-button"
        accessibilityLabel="Sign in"
        onPress={() => void signInWithEmail()}
      />

      {/* Forgot Password Link */}
      <View style={styles.forgotPasswordContainer}>
        <TextLink
          disabled={loading}
          accessibilityLabel="Forgot password"
          label={STRINGS.FORGOT_PASSWORD}
          testID="forgot-password-button"
          onPress={() => void handleForgotPassword()}
        />
      </View>

      {onCreateAccount && (
        <AuthSwitchPrompt
          disabled={loading}
          prompt={STRINGS.DONT_HAVE_ACCOUNT}
          label={STRINGS.CREATE_ACCOUNT}
          accessibilityLabel="Go to create account"
          testID="navigate-to-sign-up-link"
          onPress={onCreateAccount}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  container: {
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
