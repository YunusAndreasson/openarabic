import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';
import { createAndroidRipple } from '@/utils/layoutUtils';

export function SocialMediaIcons() {
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

  const handleTwitterPress = useCallback(
    () => handleSocialMediaPress(STRINGS.TWITTER_URL),
    [handleSocialMediaPress],
  );
  const handleInstagramPress = useCallback(
    () => handleSocialMediaPress(STRINGS.INSTAGRAM_URL),
    [handleSocialMediaPress],
  );
  const handleFacebookPress = useCallback(
    () => handleSocialMediaPress(STRINGS.FACEBOOK_URL),
    [handleSocialMediaPress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.socialIconsContainer}>
        <Pressable
          onPress={handleTwitterPress}
          android_ripple={createAndroidRipple(colors, 'small')}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
        >
          <Ionicons
            name="logo-twitter"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.textTertiary}
            style={styles.icon}
          />
        </Pressable>
        <Pressable
          onPress={handleInstagramPress}
          android_ripple={createAndroidRipple(colors, 'small')}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
        >
          <Ionicons
            name="logo-instagram"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.textTertiary}
            style={styles.icon}
          />
        </Pressable>
        <Pressable
          onPress={handleFacebookPress}
          android_ripple={createAndroidRipple(colors, 'small')}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
        >
          <Ionicons
            name="logo-facebook"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.textTertiary}
            style={styles.icon}
          />
        </Pressable>
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
