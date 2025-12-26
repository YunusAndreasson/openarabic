import type { JSX } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LegalLinks } from '@/components/auth';
import { SignInForm } from '@/components/auth';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

/**
 * Sign In Screen
 *
 * Dedicated screen for signing in with email and password.
 * Part of the progressive disclosure auth flow.
 *
 * User Journey:
 * Landing → "Continue with email" → "Sign In" → This Screen
 */
const SignInScreen = memo(function SignInScreen(): JSX.Element {
  return (
    <ThemedView
      scrollable
      useSafeArea={false}
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
            {STRINGS.SIGN_IN_TITLE}
          </ThemedText>
          <ThemedText align="center" type="body" variant="secondary" style={styles.subtitle}>
            {STRINGS.SIGN_IN_SUBTITLE}
          </ThemedText>
        </View>

        {/* Sign In Form */}
        <View style={styles.formContainer}>
          <SignInForm />
        </View>

        {/* Legal Links */}
        <LegalLinks />
      </View>
    </ThemedView>
  );
});

export default SignInScreen;

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
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
