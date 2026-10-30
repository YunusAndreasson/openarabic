import { SettingsCard } from '@/components/account/SettingsCard';
import { SettingsSection } from '@/components/account/SettingsSection';
import { STRINGS } from '@/constants/strings';
import type { ConsentChoices, ConsentPurpose } from '@/services/consent';

interface ConsentChoiceRowsProps {
  choices: ConsentChoices;
  onChange: (purpose: ConsentPurpose, value: boolean) => void;
}

/**
 * The two privacy choices as settings rows, shared by the consent step and the
 * Privacy choices screen so both offer the same thing in the same words.
 */
export const ConsentChoiceRows = ({ choices, onChange }: ConsentChoiceRowsProps) => (
  <SettingsSection>
    <SettingsCard
      icon="trending-up"
      label={STRINGS.CONSENT_ANALYTICS_LABEL}
      subtitle={STRINGS.CONSENT_ANALYTICS_DESC}
      rightType="toggle"
      testID="consent-toggle-analytics"
      toggleValue={choices.analytics}
      onToggleChange={value => onChange('analytics', value)}
    />
    <SettingsCard
      icon="eye"
      label={STRINGS.CONSENT_MEASUREMENT_LABEL}
      subtitle={STRINGS.CONSENT_MEASUREMENT_DESC}
      rightType="toggle"
      testID="consent-toggle-measurement"
      toggleValue={choices.measurement}
      onToggleChange={value => onChange('measurement', value)}
    />
  </SettingsSection>
);
