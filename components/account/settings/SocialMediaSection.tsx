import { memo, useCallback } from 'react';
import { Linking } from 'react-native';

import { SettingsCard, SettingsSection } from '@/components/account';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

/**
 * Social media links settings section.
 *
 * Includes: Twitter, Instagram, Facebook links.
 * Opens external URLs in the device browser.
 */
export const SocialMediaSection = memo(() => {
  const handleSocialMediaPress = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      handleError(error as Error, {
        analyticsEventName: 'Social_Media_Link_Failed',
        sentryTags: { location: 'account_screen', action: 'social_media' },
        sentryExtra: { url },
        showToast: false, // Silent failure for social media links
        sentrySeverity: 'info', // Not critical, just informational
      });
    }
  }, []);

  return (
    <SettingsSection title={STRINGS.FOLLOW_US}>
      <SettingsCard
        icon="logo-twitter"
        label={STRINGS.TWITTER}
        rightType="chevron"
        onPress={() => handleSocialMediaPress(STRINGS.TWITTER_URL)}
      />
      <SettingsCard
        icon="logo-instagram"
        label={STRINGS.INSTAGRAM}
        rightType="chevron"
        onPress={() => handleSocialMediaPress(STRINGS.INSTAGRAM_URL)}
      />
      <SettingsCard
        icon="logo-facebook"
        label={STRINGS.FACEBOOK}
        rightType="chevron"
        onPress={() => handleSocialMediaPress(STRINGS.FACEBOOK_URL)}
      />
    </SettingsSection>
  );
});

SocialMediaSection.displayName = 'SocialMediaSection';
