import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { errorFeedback } from '@/utils/haptics';

interface DangerZoneSectionProps {
  /** Handler for reset reading progress action */
  onResetReadingProgress: () => void;
}

/**
 * Danger zone settings section - destructive actions.
 *
 * Includes: Reset reading progress, Delete account.
 * All actions have red styling to indicate danger.
 */
export const DangerZoneSection = memo<DangerZoneSectionProps>(({ onResetReadingProgress }) => {
  const colors = useColors();

  const handleDeleteAccountPress = useCallback(() => {
    errorFeedback();
    router.push(ROUTE_PATHS.ACCOUNT_DELETE_ACCOUNT);
  }, []);

  return (
    <SettingsSection title={STRINGS.DANGER_ZONE_SECTION} dangerZone>
      <SettingsCard
        icon="refresh"
        label={STRINGS.RESET_READING_PROGRESS}
        subtitle={STRINGS.RESET_READING_PROGRESS_DESCRIPTION}
        rightType="none"
        iconColor={colors.error}
        textColor="error"
        backgroundColor={`${colors.error}0D`}
        onPress={onResetReadingProgress}
      />
      <SettingsCard
        icon="trash"
        label={STRINGS.DELETE_ACCOUNT}
        subtitle={STRINGS.DELETE_ACCOUNT_DESCRIPTION}
        rightType="chevron"
        iconColor={colors.error}
        textColor="error"
        backgroundColor={`${colors.error}0D`}
        onPress={handleDeleteAccountPress}
      />
    </SettingsSection>
  );
});

DangerZoneSection.displayName = 'DangerZoneSection';
