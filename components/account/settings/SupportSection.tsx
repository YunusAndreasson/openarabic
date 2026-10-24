import { memo, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';

import { SettingsCard, SettingsSection } from '@/components/account';
import { useTutorialContext } from '@/components/providers';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';
import { errorFeedback, successFeedback } from '@/utils/haptics';
import { resetOnboarding } from '@/utils/onboardingStorage';
import { openExternalUrl } from '@/utils/openExternalUrl';
import { fillTemplate } from '@/utils/fillTemplate';

/**
 * Where "Rate OpenArabic" goes: the App Store's write-a-review page on iOS (the
 * listing URL from app.json plus `action=write-review`), the Play listing on
 * Android, which opens in the Play Store app with its rating control. Null —
 * and no row — if neither is known, rather than a row that does nothing.
 */
function getWriteReviewUrl(): string | null {
  if (Platform.OS === 'ios') {
    const listingUrl = StoreReview.storeUrl();
    return listingUrl ? `${listingUrl}?action=write-review` : null;
  }
  const packageName = Application.applicationId;
  return packageName
    ? fillTemplate(STRINGS.PLAY_STORE_LISTING_URL, { package: packageName })
    : null;
}

const WRITE_REVIEW_URL = getWriteReviewUrl();

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
              void handleError(error, {
                toastMessage: STRINGS.RESET_TUTORIALS_FAILED,
                analyticsEventName: 'Reset_Tutorials_Failed',
              });
            }
          })(),
      },
    ]);
  }, [resetAllTutorials]);

  const handleRateApp = (url: string) =>
    openExternalUrl(url, {
      analyticsEventName: 'Store_Review_Request_Failed',
      sentryTags: { location: 'account', action: 'store_review' },
      showToast: true,
      sentrySeverity: 'warning',
    });

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
        rightType="none"
        onPress={handleResetTutorials}
      />
      {/* Opens the store's review page, so the leaving-the-app glyph is true.
          It used to ask for the in-app review sheet, which iOS and Android
          both ration and may simply not show — Apple says not to call it from
          a button for exactly that reason — so a tap could do nothing at all. */}
      {WRITE_REVIEW_URL && (
        <SettingsCard
          icon="star"
          label={STRINGS.RATE_APP}
          rightType="external"
          onPress={() => void handleRateApp(WRITE_REVIEW_URL)}
        />
      )}
    </SettingsSection>
  );
});

SupportSection.displayName = 'SupportSection';
