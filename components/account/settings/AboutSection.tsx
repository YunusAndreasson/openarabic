import { memo, useCallback } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
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
 * About settings — split into Legal and Community sections.
 *
 * Legal: Terms, Privacy, Legal & Attributions.
 * Community: Social media links.
 */
export const AboutSection = memo(() => {
  const handleTermsPress = useCallback(() => router.push(ROUTE_PATHS.TERMS), []);
  const handlePrivacyPress = useCallback(() => router.push(ROUTE_PATHS.PRIVACY), []);
  const handleLegalPress = useCallback(() => router.push(ROUTE_PATHS.LEGAL), []);

  return (
    <>
      <SettingsSection title={STRINGS.LEGAL_SECTION}>
        <SettingsCard
          icon="document-text"
          label={STRINGS.TERMS_OF_SERVICE}
          rightType="chevron"
          onPress={handleTermsPress}
        />
        <SettingsCard
          icon="shield-checkmark"
          label={STRINGS.PRIVACY_POLICY}
          rightType="chevron"
          onPress={handlePrivacyPress}
        />
        <SettingsCard
          icon="documents"
          label={STRINGS.LEGAL_ATTRIBUTIONS}
          rightType="chevron"
          onPress={handleLegalPress}
        />
      </SettingsSection>

      <SettingsSection title={STRINGS.FOLLOW_US}>
        <SettingsCard
          icon="logo-x"
          label={STRINGS.TWITTER}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.TWITTER_URL)}
        />
        <SettingsCard
          icon="logo-instagram"
          label={STRINGS.INSTAGRAM}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.INSTAGRAM_URL)}
        />
        <SettingsCard
          icon="logo-facebook"
          label={STRINGS.FACEBOOK}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.FACEBOOK_URL)}
        />
      </SettingsSection>

      {/* More from the maker — Yunus Andreasson's personal identity + sibling
          apps. Separate from the brand FOLLOW_US section above by design. */}
      <SettingsSection title={STRINGS.MORE_FROM_MAKER}>
        <SettingsCard
          icon="person-circle"
          label={STRINGS.MAKER_BYLINE}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.MAKER_HUB_URL)}
        />
        <SettingsCard
          icon="logo-github"
          label={STRINGS.MAKER_GITHUB}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.MAKER_GITHUB_URL)}
        />
        <SettingsCard
          icon="logo-x"
          label={STRINGS.MAKER_X}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.MAKER_X_URL)}
        />
        <SettingsCard
          icon="logo-instagram"
          label={STRINGS.MAKER_INSTAGRAM}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.MAKER_INSTAGRAM_URL)}
        />
        <SettingsCard
          icon="logo-linkedin"
          label={STRINGS.MAKER_LINKEDIN}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.MAKER_LINKEDIN_URL)}
        />
        <SettingsCard
          icon="globe-outline"
          label={STRINGS.OTHER_APPS_ISLAM_SE}
          subtitle={STRINGS.OTHER_APPS_ISLAM_SE_SUBTITLE}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.OTHER_APPS_ISLAM_SE_URL)}
        />
        <SettingsCard
          icon="globe-outline"
          label={STRINGS.OTHER_APPS_AL_IBADAH}
          subtitle={STRINGS.OTHER_APPS_AL_IBADAH_SUBTITLE}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.OTHER_APPS_AL_IBADAH_URL)}
        />
        <SettingsCard
          icon="globe-outline"
          label={STRINGS.OTHER_APPS_ZUHD}
          subtitle={STRINGS.OTHER_APPS_ZUHD_SUBTITLE}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.OTHER_APPS_ZUHD_URL)}
        />
        <SettingsCard
          icon="globe-outline"
          label={STRINGS.OTHER_APPS_QAMAR}
          subtitle={STRINGS.OTHER_APPS_QAMAR_SUBTITLE}
          rightType="external"
          onPress={() => openSocialLink(STRINGS.OTHER_APPS_QAMAR_URL)}
        />
      </SettingsSection>
    </>
  );
});

AboutSection.displayName = 'AboutSection';
