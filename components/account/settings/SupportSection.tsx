import { memo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';

import { SettingsCard, SettingsSection } from '@/components/account';
import { useTutorialContext } from '@/components/providers';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';
import { errorFeedback, lightFeedback, successFeedback } from '@/utils/haptics';
import { resetOnboarding } from '@/utils/onboardingStorage';

interface SupportSectionProps {
  /** Open the feedback form */
  onContactSupportPress: () => void;
}

/**
 * Help settings — everything a stuck user reaches for.
 *
 * "Show tutorials again" belongs here rather than under the study settings it
 * used to sit among: it restores help, it doesn't change how the app teaches.
 */
export const SupportSection = memo<SupportSectionProps>(({ onContactSupportPress }) => {
  const { resetAllTutorials } = useTutorialContext();

  const handleHelpPress = useCallback(() => router.push(ROUTE_PATHS.ACCOUNT_HELP), []);

  const handleResetTutorials = useCallback(() => {
    Alert.alert(STRINGS.RESET_TUTORIALS_TITLE, STRINGS.RESET_TUTORIALS_MESSAGE, [
      { text: STRINGS.CANCEL, style: 'cancel' },
      {
        text: STRINGS.RESET,
        onPress: () =>
          void (async () => {
            try {
              await resetAllTutorials();
              // Also re-enable the first-run intro + Get started checklist
              await resetOnboarding();
              successFeedback();
            } catch (error) {
              errorFeedback();
              handleError(error, {
                toastMessage: STRINGS.RESET_TUTORIALS_FAILED,
                analyticsEventName: 'Reset_Tutorials_Failed',
              });
            }
          })(),
      },
    ]);
  }, [resetAllTutorials]);

  const handleRequestReview = useCallback(async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        handleError(new Error('StoreReview not available'), {
          analyticsEventName: 'Store_Review_Not_Available',
          sentryTags: { location: 'account', action: 'store_review' },
          sentryExtra: { storeUrl: StoreReview.storeUrl() },
          sentrySeverity: 'info',
          showToast: false,
        });
        return;
      }
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      await StoreReview.requestReview();
      lightFeedback();
    } catch (error) {
      handleError(error, {
        analyticsEventName: 'Store_Review_Request_Failed',
        sentryTags: { location: 'account', action: 'store_review' },
        showToast: true,
        sentrySeverity: 'warning',
      });
    }
  }, []);

  return (
    <SettingsSection title={STRINGS.HELP_SECTION}>
      <SettingsCard
        icon="help-circle"
        label={STRINGS.HELP_CENTER}
        rightType="chevron"
        onPress={handleHelpPress}
      />
      <SettingsCard
        icon="mail"
        label={STRINGS.CONTACT_SUPPORT}
        rightType="chevron"
        onPress={onContactSupportPress}
      />
      <SettingsCard
        icon="school"
        label={STRINGS.RESET_TUTORIALS}
        subtitle={STRINGS.RESET_TUTORIALS_SUBTITLE}
        rightType="none"
        onPress={handleResetTutorials}
      />
      {/* Hands off to the OS review sheet, so it carries the leaving-the-app
          glyph rather than looking inert. */}
      <SettingsCard
        icon="star"
        label={STRINGS.RATE_APP}
        rightType="external"
        onPress={() => void handleRequestReview()}
      />
    </SettingsSection>
  );
});

SupportSection.displayName = 'SupportSection';
