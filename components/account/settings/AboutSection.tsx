import { memo } from 'react';
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
  return (
    <SettingsSection title={STRINGS.ABOUT_SECTION}>
      <SettingsCard
        icon="document-text"
        label={STRINGS.TERMS_OF_SERVICE}
        rightType="chevron"
        onPress={() => router.push(ROUTE_PATHS.TERMS)}
      />
      <SettingsCard
        icon="shield-checkmark"
        label={STRINGS.PRIVACY_POLICY}
        rightType="chevron"
        onPress={() => router.push(ROUTE_PATHS.PRIVACY)}
      />
      <SettingsCard
        icon="documents"
        label={STRINGS.LEGAL_ATTRIBUTIONS}
        rightType="chevron"
        onPress={() => router.push(ROUTE_PATHS.LEGAL)}
      />
    </SettingsSection>
  );
});

AboutSection.displayName = 'AboutSection';
