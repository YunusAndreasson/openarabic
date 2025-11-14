import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import pkg from '@/package.json';

export const BrandFooter = memo(() => {
  const currentYear = new Date().getFullYear();

  // Use pkg.version directly to ensure build number is included (format: "1447.5.37+188")
  const versionString = pkg.version || '0.0.0';
  const [version, buildNumber] = versionString.split('+');
  const versionDisplay = buildNumber ? `Version ${version} (${buildNumber})` : `Version ${version}`;

  return (
    <View style={styles.container}>
      <ThemedText type="caption" colorName="textTertiary" style={styles.version}>
        {versionDisplay}
      </ThemedText>
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
  version: {
    opacity: LAYOUT.OPACITY.HIGH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  copyright: {
    opacity: LAYOUT.OPACITY.HIGH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  logo: {
    width: 120,
    height: 40,
    opacity: LAYOUT.OPACITY.SUBTLE,
    alignSelf: 'center',
  },
});
