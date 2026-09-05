import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthCredentialFields } from './AuthFormInputs';
import { AuthSwitchPrompt } from './AuthSwitchPrompt';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuthFormFields } from '@/hooks/auth/useAuthFormFields';

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
  const fields = useAuthFormFields();
  const { password, loading, signUpWithEmail } = fields;

  const handleSignIn = useCallback(() => {
    router.push(ROUTE_PATHS.AUTH_SIGN_IN);
  }, []);

  return (
    <View style={styles.container}>
      <AuthCredentialFields fields={fields} onPasswordSubmit={() => void signUpWithEmail()} isSignUp>
        <PasswordStrengthMeter password={password} />
      </AuthCredentialFields>

      <ThemedButton
        disabled={loading}
        loading={loading}
        fullWidth
        style={styles.button}
        title={STRINGS.CREATE_ACCOUNT}
        testID="create-account-button"
        accessibilityLabel="Create account"
        onPress={() => void signUpWithEmail()}
      />

      <AuthSwitchPrompt
        prompt={STRINGS.ALREADY_HAVE_ACCOUNT}
        label={STRINGS.SIGN_IN}
        accessibilityLabel="Go to sign in"
        testID="navigate-to-sign-in-link"
        onPress={handleSignIn}
      />
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
