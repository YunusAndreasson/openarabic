import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthCredentialFields } from './AuthFormInputs';
import { AuthSwitchPrompt } from './AuthSwitchPrompt';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import type { StartReaderAuth } from '@/services/readerSaveAuth';
import { STRINGS } from '@/constants/strings';
import { useAuthFormFields } from '@/hooks/auth/useAuthFormFields';

/**
 * Sign Up Form Component
 *
 * Dedicated form for creating a new account with email and password.
 * Email registration step in the account modal.
 *
 * Features:
 * - Email and password inputs with validation
 * - Password strength meter
 * - Link to sign in screen
 * - Loading states
 * - Error handling
 */
export function SignUpForm({
  onSignIn,
  startAttempt,
}: { onSignIn?: () => void; startAttempt?: StartReaderAuth } = {}): JSX.Element {
  const fields = useAuthFormFields(true, startAttempt);
  const { password, passwordError, loading, signUpWithEmail } = fields;

  return (
    <View style={styles.container}>
      <AuthCredentialFields
        fields={fields}
        onPasswordSubmit={() => void signUpWithEmail()}
        isSignUp
      >
        {/* The field already explains a rejected password. Keep the strength hint
            for typing, rather than repeating the minimum-length error. */}
        {passwordError ? null : <PasswordStrengthMeter password={password} />}
      </AuthCredentialFields>

      <ThemedButton
        disabled={loading}
        loading={loading}
        fullWidth
        allowTitleWrap
        style={styles.button}
        title={STRINGS.CREATE_ACCOUNT}
        testID="create-account-button"
        accessibilityLabel="Create account"
        onPress={() => void signUpWithEmail()}
      />

      {onSignIn && (
        <AuthSwitchPrompt
          disabled={loading}
          prompt={STRINGS.ALREADY_HAVE_ACCOUNT}
          label={STRINGS.SIGN_IN}
          accessibilityLabel="Go to sign in"
          testID="navigate-to-sign-in-link"
          onPress={onSignIn}
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
});
