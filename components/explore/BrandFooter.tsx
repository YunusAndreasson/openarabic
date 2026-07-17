import * as Updates from 'expo-updates';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, LETTER_SPACING } from '@/constants/layout';
import pkg from '@/package.json';

interface BrandFooterProps {
  /** Show version and copyright info (default: false, use true for Settings page) */
  showDetails?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

// First 8 chars of the update group UUID is enough to disambiguate against
// `eas update:list` output. "embedded" means no OTA has been applied yet — the
// app is running the JS bundle baked into the binary.
function getOtaLabel(): string {
  const id = Updates.updateId;
  // `||`, not `??`: on a build with no channel configured `Updates.channel` is an
  // empty string rather than null, which `??` passes through and renders as a
  // dangling separator ("OTA embedded · ").
  const channel = Updates.channel || 'unknown';
  if (!id) return `OTA embedded · ${channel}`;
  return `OTA ${id.slice(0, 8)} · ${channel}`;
}

export const BrandFooter = memo(({ showDetails = false }: BrandFooterProps) => {
  // Use pkg.version directly to ensure build number is included (format: "1447.5.37+188")
  const versionString = pkg.version || '0.0.0';
  const [version, buildNumber] = versionString.split('+');
  const versionDisplay = buildNumber ? `Version ${version} (${buildNumber})` : `Version ${version}`;
  const otaLabel = showDetails ? getOtaLabel() : null;

  return (
    <View style={styles.container}>
      {showDetails && (
        <ThemedText type="caption" colorName="textTertiary" style={styles.version}>
          {versionDisplay}
        </ThemedText>
      )}
      {otaLabel && (
        <ThemedText type="caption" colorName="textTertiary" style={styles.version}>
          {otaLabel}
        </ThemedText>
      )}
      <ThemedText type="caption" colorName="textTertiary" style={styles.copyright}>
        © {CURRENT_YEAR} OpenArabic
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
    paddingTop: LAYOUT.SPACING.XXXLARGE, // 48px - clear separation from content
    paddingBottom: LAYOUT.SPACING.XLARGE, // 24px - breathing room below logo
  },
  version: {
    opacity: LAYOUT.OPACITY.HIGH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: LETTER_SPACING.WIDE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  copyright: {
    opacity: LAYOUT.OPACITY.HIGH,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: LETTER_SPACING.WIDE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  logo: {
    width: LAYOUT.BRAND.LOGO_WIDTH,
    height: LAYOUT.BRAND.LOGO_HEIGHT,
    opacity: LAYOUT.OPACITY.SUBTLE,
    alignSelf: 'center',
  },
});
