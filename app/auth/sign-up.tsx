import type { JSX } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LegalLinks } from '@/components/auth/LegalLinks';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

/**
 * Sign Up Screen
 *
 * Dedicated screen for creating a new account with email and password.
 * Part of the progressive disclosure auth flow.
 *
 * User Journey:
 * Landing → "Continue with email" → "Create Account" → This Screen
 */
const SignUpScreen = memo(function SignUpScreen(): JSX.Element {
  return (
    <ThemedView
      scrollable
      useSafeArea={true}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={{
        keyboardShouldPersistTaps: 'handled',
        showsVerticalScrollIndicator: false,
        keyboardDismissMode: 'interactive',
      }}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <ThemedText align="center" type="heading1" colorName="headingText">
            {STRINGS.CREATE_ACCOUNT_TITLE}
          </ThemedText>
          <ThemedText align="center" type="body" variant="secondary" style={styles.subtitle}>
            {STRINGS.CREATE_ACCOUNT_SUBTITLE}
          </ThemedText>
        </View>

        {/* Sign Up Form */}
        <View style={styles.formContainer}>
          <SignUpForm />
        </View>

        {/* Legal Links */}
        <LegalLinks />
      </View>
    </ThemedView>
  );
});

export default SignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  formContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
    maxWidth: SCREEN_WIDTH * 0.9,
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
    marginTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: LAYOUT.SPACING.XXLARGE,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
