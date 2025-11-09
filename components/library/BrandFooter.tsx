import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

export const BrandFooter = memo(() => {
  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <ThemedText type="caption" colorName="textTertiary" style={styles.copyright}>
        © {currentYear} OpenArabic
      </ThemedText>
      <Image
        source={require('@/assets/images/oaLogo.png')}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
});

BrandFooter.displayName = 'BrandFooter';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -LAYOUT.SPACING.MEDIUM, // Extend beyond ScrollView content padding
    paddingTop: LAYOUT.SPACING.XLARGE, // 24px - tighter spacing
    paddingBottom: LAYOUT.SPACING.SMALL, // 8px - tighter spacing
  },
  copyright: {
    opacity: 0.4,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  logo: {
    width: 120,
    height: 40,
    opacity: 0.3,
    alignSelf: 'center',
  },
});
