import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { EmailAuthOptions } from '@/components/auth/EmailAuthOptions';
import { LegalLinks } from '@/components/auth/LegalLinks';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

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
        {/* Email Options Toggle Button */}
        <ThemedButton
          variant="outlined"
          title={showEmailOptions ? STRINGS.HIDE_EMAIL_OPTIONS : STRINGS.CONTINUE_WITH_EMAIL_OPTION}
          icon="mail-outline"
          iconSize={20}
          uppercase={false}
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

        {/* Social Authentication Buttons - Bottom for easy thumb access */}
        <SocialAuthButtons />
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
    paddingHorizontal: LAYOUT.SPACING.LARGE, // Content padding for alignment
    width: '100%',
  },
  emailOptionsContainer: {
    marginTop: LAYOUT.SPACING.XLARGE, // Clearer separation when expanded (was LARGE)
    width: '100%',
  },
  emailToggleButton: {
    width: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XXXLARGE, // Major section separator (was XLARGE)
    marginTop: LAYOUT.SPACING.XXXLARGE, // More breathing room at top (was MEDIUM)
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  logo: {
    width: LAYOUT.BRAND.LOGO_WIDTH * 1.5, // 120px - Larger for auth screen prominence
    height: LAYOUT.BRAND.LOGO_HEIGHT * 1.5, // 60px - Maintains 2:1 ratio
    marginBottom: LAYOUT.SPACING.LARGE, // Tighter grouping with title - Law of Proximity (was XLARGE)
    backgroundColor: 'transparent',
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.SMALL, // Subtitle subordinate to title (was MEDIUM)
  },
});
