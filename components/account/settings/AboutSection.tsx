import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { openExternalUrl } from '@/utils/openExternalUrl';

const openSocialLink = (url: string) =>
  openExternalUrl(url, {
    analyticsEventName: 'Social_Media_Link_Failed',
    sentryTags: { location: 'account_screen', action: 'social_media' },
    showToast: false,
    sentrySeverity: 'info',
  });

/**
 * About — the legal documents and the maker's credit.
 *
 * The credit used to be a section of its own holding a single row; it reads the
 * same here and costs one fewer heading.
 */
export const AboutSection = memo(() => {
  const handleTermsPress = useCallback(() => router.push(ROUTE_PATHS.TERMS), []);
  const handlePrivacyPress = useCallback(() => router.push(ROUTE_PATHS.PRIVACY), []);
  const handleLegalPress = useCallback(() => router.push(ROUTE_PATHS.LEGAL), []);

  return (
    <>
      <SettingsSection title={STRINGS.ABOUT_SECTION}>
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
        <SettingsCard
          icon="person-circle"
          label={STRINGS.MAKER_BYLINE}
          rightType="external"
          onPress={() => void openSocialLink(STRINGS.MAKER_PROJECTS_URL)}
        />
      </SettingsSection>

      <SettingsSection title={STRINGS.FOLLOW_US}>
        <SettingsCard
          icon="logo-x"
          label={STRINGS.TWITTER}
          rightType="external"
          onPress={() => void openSocialLink(STRINGS.TWITTER_URL)}
        />
        <SettingsCard
          icon="logo-instagram"
          label={STRINGS.INSTAGRAM}
          rightType="external"
          onPress={() => void openSocialLink(STRINGS.INSTAGRAM_URL)}
        />
        <SettingsCard
          icon="logo-facebook"
          label={STRINGS.FACEBOOK}
          rightType="external"
          onPress={() => void openSocialLink(STRINGS.FACEBOOK_URL)}
        />
      </SettingsSection>
    </>
  );
});

AboutSection.displayName = 'AboutSection';
