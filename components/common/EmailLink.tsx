import type { FC } from 'react';
import { useCallback } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import type { ThemedTextProps } from '@/types/ui/text.types';
import { handleError } from '@/utils/errorHandling';

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
 * @example
 * ```tsx
 * <ThemedText type="body">
 *   Questions? Contact us at <EmailLink email={STRINGS.CONTACT_EMAIL} />
 * </ThemedText>
 * ```
 */
export const EmailLink: FC<EmailLinkProps> = ({ email, type = 'body' }) => {
  const handleEmailPress = useCallback(async () => {
    try {
      const mailtoUrl = `mailto:${email}`;
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Use handleError for consistent error tracking
        handleError(new Error('Cannot open email client'), {
          analyticsEventName: 'Email_Client_Unavailable',
          sentryTags: { location: 'email_link', action: 'canOpenURL' },
          sentryExtra: { email, mailtoUrl },
          showToast: false, // Silent failure for email links
          sentrySeverity: 'info', // Not critical, just informational
        });
      }
    } catch (error) {
      handleError(error, {
        analyticsEventName: 'Email_Link_Failed',
        sentryTags: { location: 'email_link', action: 'mailto' },
        sentryExtra: { email },
        showToast: false, // Silent failure for email links
        sentrySeverity: 'info', // Not critical, just informational
      });
    }
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
