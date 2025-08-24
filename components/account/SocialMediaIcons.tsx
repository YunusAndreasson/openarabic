import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';

export const SocialMediaIcons = memo(() => {
  const colors = useColors();

  const handleSocialMediaPress = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      handleError(error as Error, {
        analyticsEventName: 'Social_Media_Link_Failed',
        sentryTags: { location: 'account', action: 'social_media_link' },
        sentryExtra: { url },
        showToast: false, // Silent failure for social media links
        sentrySeverity: 'info', // Not critical, just informational
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.socialIconsContainer}>
        <Ionicons
          name="logo-twitter"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          color={colors.textTertiary}
          style={styles.icon}
          onPress={() => handleSocialMediaPress(STRINGS.TWITTER_URL)}
        />
        <Ionicons
          name="logo-instagram"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          color={colors.textTertiary}
          style={styles.icon}
          onPress={() => handleSocialMediaPress(STRINGS.INSTAGRAM_URL)}
        />
        <Ionicons
          name="logo-facebook"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          color={colors.textTertiary}
          style={styles.icon}
          onPress={() => handleSocialMediaPress(STRINGS.FACEBOOK_URL)}
        />
      </View>

      <Image
        source={require('@/assets/images/oaLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
});

SocialMediaIcons.displayName = 'SocialMediaIcons';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  icon: {
    opacity: 0.6,
  },
  logo: {
    width: 80,
    height: 40,
    opacity: 0.3,
  },
});
