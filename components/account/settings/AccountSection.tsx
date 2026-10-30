import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface AccountSectionProps {
  /** The signed-in address, or the "no email" copy when the account has none */
  email: string;
  /** Sign out of the current session */
  onSignOut: () => void;
  /** Handler for reset reading progress action */
  onResetReadingProgress: () => void;
}

/**
 * Which account is signed in, then the session and destructive actions, last
 * on the screen.
 *
 * The address is a plain row, not a profile card. The card it replaced guessed
 * a first name from the address (an Apple private-relay address made one up
 * out of random letters), offered a photo nobody else ever saw, and opened the
 * screen with a "member since" date; the address alone answers "which account
 * is this?", which is the only question the screen has to answer about it.
 *
 * There is no red-bordered "Danger Zone" box any more — that is GitHub's term
 * and GitHub's chrome, and neither belongs in a reading app. The red icon and
 * label carry the warning, and all three action rows already sit behind a
 * confirmation: an alert for the first two, a type-DELETE screen for the third.
 * None of them has a subtitle: each label already says what happens.
 */
export const AccountSection = memo<AccountSectionProps>(
  ({ email, onSignOut, onResetReadingProgress }) => {
    const colors = useColors();

    // No haptic on the way in: opening a screen is not an error, and the
    // screen itself asks for confirmation.
    const handleDeleteAccountPress = useCallback(() => {
      router.push(ROUTE_PATHS.ACCOUNT_DELETE_ACCOUNT);
    }, []);

    return (
      <SettingsSection title={STRINGS.ACCOUNT}>
        <SettingsCard icon="person-circle" label={STRINGS.SIGNED_IN_AS} subtitle={email} />
        <SettingsCard
          icon="log-out"
          label={STRINGS.SIGN_OUT}
          rightType="none"
          onPress={onSignOut}
        />
        <SettingsCard
          icon="refresh"
          label={STRINGS.RESET_READING_PROGRESS}
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
          rightType="chevron"
          iconColor={colors.error}
          textColor="error"
          onPress={handleDeleteAccountPress}
        />
      </SettingsSection>
    );
  },
);

AccountSection.displayName = 'AccountSection';
