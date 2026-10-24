import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import type { ThemedTextProps } from '@/types/ui/text.types';
import { openExternalUrl } from '@/utils/openExternalUrl';

interface EmailLinkProps {
  email: string;
  type?: ThemedTextProps['type'];
}

/**
 * EmailLink - Inline tappable email component
 *
 * Renders an email address as an inline link that opens the default email client.
 * Designed to blend seamlessly with surrounding text while being visually distinct.
 *
 * It used to ask `Linking.canOpenURL('mailto:…')` first, which says false on
 * Android 11+ and on iOS whenever the scheme is not declared — so the "Contact
 * us" links did nothing on most phones. See `openExternalUrl`.
 *
 * @example
 * ```tsx
 * <ThemedText type="body">
 *   Questions? Contact us at <EmailLink email={STRINGS.CONTACT_EMAIL} />
 * </ThemedText>
 * ```
 */
export const EmailLink = ({ email, type = 'body' }: EmailLinkProps) => {
  const handleEmailPress = useCallback(() => {
    void openExternalUrl(`mailto:${email}`, {
      analyticsEventName: 'Email_Link_Failed',
      sentryTags: { location: 'email_link', action: 'mailto' },
      sentryExtra: { email },
      showToast: false, // Silent failure for email links
      sentrySeverity: 'info', // Not critical, just informational
    });
  }, [email]);

  return (
    <ThemedText
      type={type}
      colorName="tint"
      style={styles.link}
      accessibilityRole="link"
      accessibilityLabel={email}
      onPress={handleEmailPress}
      suppressHighlighting={true}
    >
      {email}
    </ThemedText>
  );
};

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});
