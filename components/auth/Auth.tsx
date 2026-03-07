import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/ui/EnhancedImage';
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
 * Auth flow:
 * 1. Social buttons (Apple, Google) - Primary options
 * 2. Divider
 * 3. Email Sign In / Create Account navigation buttons
 */
export function Auth(): JSX.Element {
  // Auth hooks lifted here for unified loading state
  const appleAuth = useAppleAuth();
  const googleAuth = useGoogleAuth();

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
        {/* Social Authentication Buttons */}
        <SocialAuthButtons appleAuth={appleAuth} googleAuth={googleAuth} />

        {/* Email Auth Options (Sign In / Create Account) */}
        <EmailAuthOptions />
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
