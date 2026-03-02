import { memo } from 'react';
import { Linking } from 'react-native';

import { SettingsCard, SettingsSection } from '@/components/account';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

const openSocialLink = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    handleError(error as Error, {
      analyticsEventName: 'Social_Media_Link_Failed',
      sentryTags: { location: 'account_screen', action: 'social_media' },
      sentryExtra: { url },
      showToast: false,
      sentrySeverity: 'info',
    });
  }
};

/**
 * Social media links settings section.
 *
 * Includes: X, Instagram, Facebook links.
 * Opens external URLs in the device browser.
 */
export const SocialMediaSection = memo(() => {
  return (
    <SettingsSection title={STRINGS.FOLLOW_US}>
      <SettingsCard
        icon="logo-x"
        label={STRINGS.TWITTER}
        rightType="chevron"
        onPress={() => openSocialLink(STRINGS.TWITTER_URL)}
      />
      <SettingsCard
        icon="logo-instagram"
        label={STRINGS.INSTAGRAM}
        rightType="chevron"
        onPress={() => openSocialLink(STRINGS.INSTAGRAM_URL)}
      />
      <SettingsCard
        icon="logo-facebook"
        label={STRINGS.FACEBOOK}
        rightType="chevron"
        onPress={() => openSocialLink(STRINGS.FACEBOOK_URL)}
      />
    </SettingsSection>
  );
});

SocialMediaSection.displayName = 'SocialMediaSection';
