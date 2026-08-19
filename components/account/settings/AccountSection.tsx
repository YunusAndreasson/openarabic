import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { errorFeedback } from '@/utils/haptics';

interface AccountSectionProps {
  /** Sign out of the current session */
  onSignOut: () => void;
  /** Handler for reset reading progress action */
  onResetReadingProgress: () => void;
}

/**
 * Session and destructive actions, last on the screen.
 *
 * There is no red-bordered "Danger Zone" box any more — that is GitHub's term
 * and GitHub's chrome, and neither belongs in a reading app. The red icon and
 * label carry the warning, and all three rows already sit behind a
 * confirmation: an alert for the first two, a type-DELETE screen for the third.
 */
export const AccountSection = memo<AccountSectionProps>(({ onSignOut, onResetReadingProgress }) => {
  const colors = useColors();

  const handleDeleteAccountPress = useCallback(() => {
    errorFeedback();
    router.push(ROUTE_PATHS.ACCOUNT_DELETE_ACCOUNT);
  }, []);

  return (
    <SettingsSection title={STRINGS.ACCOUNT}>
      <SettingsCard icon="log-out" label={STRINGS.SIGN_OUT} rightType="none" onPress={onSignOut} />
      <SettingsCard
        icon="refresh"
        label={STRINGS.RESET_READING_PROGRESS}
        subtitle={STRINGS.RESET_READING_PROGRESS_DESCRIPTION}
        rightType="none"
        iconColor={colors.error}
        textColor="error"
        onPress={onResetReadingProgress}
      />
      {/* This one pushes a whole screen, so it says so. It used to render with
          no right-hand affordance at all. */}
      <SettingsCard
        icon="trash"
        label={STRINGS.DELETE_ACCOUNT}
        subtitle={STRINGS.DELETE_ACCOUNT_DESCRIPTION}
        rightType="chevron"
        iconColor={colors.error}
        textColor="error"
        onPress={handleDeleteAccountPress}
      />
    </SettingsSection>
  );
});

AccountSection.displayName = 'AccountSection';
