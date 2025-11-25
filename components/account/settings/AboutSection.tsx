import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * About settings section - legal and informational links.
 *
 * Includes: Terms of Service, Privacy Policy, Legal Attributions.
 */
export const AboutSection = memo(() => {
  const handleTermsPress = useCallback(() => {
    router.push(ROUTE_PATHS.TERMS);
  }, []);

  const handlePrivacyPress = useCallback(() => {
    router.push(ROUTE_PATHS.PRIVACY);
  }, []);

  const handleLegalPress = useCallback(() => {
    router.push(ROUTE_PATHS.LEGAL);
  }, []);

  return (
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
    </SettingsSection>
  );
});

AboutSection.displayName = 'AboutSection';
