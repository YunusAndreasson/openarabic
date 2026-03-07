import { memo, useCallback } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

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
 * About settings section - legal, rating, and social links.
 *
 * Includes: Terms, Privacy, Legal, Rate app, social media links.
 */
export const AboutSection = memo(() => {
  const handleTermsPress = useCallback(() => router.push(ROUTE_PATHS.TERMS), []);
  const handlePrivacyPress = useCallback(() => router.push(ROUTE_PATHS.PRIVACY), []);
  const handleLegalPress = useCallback(() => router.push(ROUTE_PATHS.LEGAL), []);

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
      await new Promise(resolve => setTimeout(resolve, 100));
      await StoreReview.requestReview();
      lightFeedback();
    } catch (error) {
      handleError(error as Error, {
        analyticsEventName: 'Store_Review_Request_Failed',
        sentryTags: { location: 'account', action: 'store_review' },
        showToast: true,
        sentrySeverity: 'warning',
      });
    }
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
      <SettingsCard
        icon="star"
        label={STRINGS.RATE_APP}
        rightType="external"
        onPress={handleRequestReview}
      />
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
  );
});

AboutSection.displayName = 'AboutSection';
