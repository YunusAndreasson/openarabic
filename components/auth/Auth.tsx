import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/ui/EnhancedImage';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';

import { EmailAuthOptions } from './EmailAuthOptions';
import { LegalLinks } from './LegalLinks';
import { SocialAuthButtons } from './SocialAuthButtons';

/**
 * Authentication Landing Component
 *
 * Modern progressive disclosure auth flow:
 * 1. Social buttons (Apple, Google) - Primary options
 * 2. "Continue with email" button - Collapsible
 * 3. When expanded: Sign In / Create Account navigation buttons
 *
 * This component prioritizes social auth while keeping email auth accessible.
 * Follows 2025 UX best practices for mobile authentication.
 */
export function Auth(): JSX.Element {
  const [showEmailOptions, setShowEmailOptions] = useState(false);

  // Auth hooks lifted here for unified loading state
  const appleAuth = useAppleAuth();
  const googleAuth = useGoogleAuth();
  const isSocialAuthLoading = appleAuth.loading || googleAuth.loading;

  const handleToggleEmailOptions = useCallback(() => {
    setShowEmailOptions(prev => !prev);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        {/* Logo */}
        <EnhancedImage
          source={require('@/assets/images/oaLogo.png')}
          style={styles.logo}
          contentFit="contain"
        />

        <ThemedText align="center" type="heading1" colorName="headingText">
          {STRINGS.WELCOME_TITLE}
        </ThemedText>
        <ThemedText align="center" type="body" variant="secondary" style={styles.subtitle}>
          {STRINGS.WELCOME_SUBTITLE}
        </ThemedText>
      </View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Social Authentication Buttons - Primary action, top for visibility */}
        <SocialAuthButtons appleAuth={appleAuth} googleAuth={googleAuth} />

        {/* Email Options Toggle Button - Secondary option */}
        <ThemedButton
          variant="outlined"
          title={showEmailOptions ? STRINGS.HIDE_EMAIL_OPTIONS : STRINGS.CONTINUE_WITH_EMAIL_OPTION}
          icon="mail-outline"
          iconSize={20}
          uppercase={false}
          disabled={isSocialAuthLoading}
          style={styles.emailToggleButton}
          testID="toggle-email-options-button"
          accessibilityLabel={
            showEmailOptions ? 'Hide email sign in options' : 'Show email sign in options'
          }
          onPress={handleToggleEmailOptions}
        />

        {/* Email Auth Options (Sign In / Create Account buttons) */}
        {showEmailOptions ? (
          <View style={styles.emailOptionsContainer}>
            <EmailAuthOptions />
          </View>
        ) : null}
      </View>

      {/* Legal Links */}
      <LegalLinks />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  contentContainer: {
    maxWidth: SCREEN_WIDTH * 0.9,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  emailOptionsContainer: {
    marginTop: LAYOUT.SPACING.LARGE, // Grouped with email toggle (proximity)
    width: '100%',
  },
  emailToggleButton: {
    marginTop: LAYOUT.SPACING.XLARGE, // Clear separation after divider
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XXLARGE, // Balanced separation to actions
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  logo: {
    width: LAYOUT.BRAND.LOGO_WIDTH * 1.5, // 120px
    height: LAYOUT.BRAND.LOGO_HEIGHT * 1.5, // 60px
    marginBottom: LAYOUT.SPACING.MEDIUM, // Tight grouping with title (proximity)
    backgroundColor: 'transparent',
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.SMALL, // Subordinate to title (hierarchy)
    paddingHorizontal: LAYOUT.SPACING.XLARGE, // Narrower width for better readability
  },
});
