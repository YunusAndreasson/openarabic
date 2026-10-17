import { EnhancedImage } from '@/components/ui';
import type { JSX } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { AUTH_CONTENT_MAX_WIDTH_RATIO, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';

import { EmailAuthOptions } from './EmailAuthOptions';
import { LegalLinks } from './LegalLinks';
import { SocialAuthButtons } from './SocialAuthButtons';

// Hallmark features, verb-first (read / tap / listen)
const VALUE_PROP_ROWS = [
  { verb: STRINGS.AUTH_VALUE_READ_VERB, rest: STRINGS.AUTH_VALUE_READ },
  { verb: STRINGS.AUTH_VALUE_TAP_VERB, rest: STRINGS.AUTH_VALUE_TAP },
  { verb: STRINGS.AUTH_VALUE_LISTEN_VERB, rest: STRINGS.AUTH_VALUE_LISTEN },
] as const;

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
  const { width } = useWindowDimensions();

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

        {/* Value proposition — three terse lines, bold leading verb */}
        <View style={styles.valueProps}>
          {VALUE_PROP_ROWS.map(({ verb, rest }) => (
            <ThemedText key={verb} align="center" type="body" colorName="secondaryText">
              <ThemedText type="bodyBold">{verb}</ThemedText> {rest}
            </ThemedText>
          ))}
        </View>
      </View>

      {/* Content Container */}
      <View style={[styles.contentContainer, { maxWidth: width * AUTH_CONTENT_MAX_WIDTH_RATIO }]}>
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
  valueProps: {
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.LARGE, // Subordinate to title (hierarchy)
    paddingHorizontal: LAYOUT.SPACING.XLARGE, // Narrower width for better readability
  },
});
