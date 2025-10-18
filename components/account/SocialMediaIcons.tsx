import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';

export function SocialMediaIcons() {
  const colors = useColors();

  const handleSocialMediaPress = async (url: string) => {
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
  };

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

      <EnhancedImage
        source={require('@/assets/images/oaLogo.png')}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
}

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
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  logo: {
    width: LAYOUT.BRAND.LOGO_WIDTH,
    height: LAYOUT.BRAND.LOGO_HEIGHT,
    opacity: LAYOUT.OPACITY.SUBTLE,
    backgroundColor: 'transparent', // Override EnhancedImage's default background
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
  },
});
