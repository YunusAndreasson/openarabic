import type { FC } from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

/**
 * Legal & Attributions Screen
 * Displays third-party service acknowledgments and open source license information
 */
const LegalAttributionsScreen: FC = () => {
  const insets = useSafeAreaInsets();

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.content}
        useSafeArea={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: LAYOUT.SPACING.XLARGE + insets.bottom },
        ]}
      >
        {/* Introduction */}
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.LEGAL_INTRO}
        </ThemedText>

        {/* Audio Generation Services */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.LEGAL_AUDIO_TITLE}
        </ThemedText>

        <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
          {STRINGS.LEGAL_AUDIO_ELEVENLABS}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.LEGAL_AUDIO_ELEVENLABS_DESC}
        </ThemedText>
        <TouchableOpacity
          onPress={() => handleLinkPress(STRINGS.LEGAL_AUDIO_ELEVENLABS_URL)}
          style={styles.linkContainer}
        >
          <ThemedText type="body" colorName="tint" style={styles.link}>
            {STRINGS.LEGAL_AUDIO_ELEVENLABS_URL}
          </ThemedText>
        </TouchableOpacity>

        {/* Error Tracking */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.LEGAL_ERROR_TRACKING_TITLE}
        </ThemedText>

        <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
          {STRINGS.LEGAL_ERROR_SENTRY}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.LEGAL_ERROR_SENTRY_DESC}
        </ThemedText>
        <TouchableOpacity
          onPress={() => handleLinkPress(STRINGS.LEGAL_ERROR_SENTRY_URL)}
          style={styles.linkContainer}
        >
          <ThemedText type="body" colorName="tint" style={styles.link}>
            {STRINGS.LEGAL_ERROR_SENTRY_URL}
          </ThemedText>
        </TouchableOpacity>

        {/* Typefaces/Fonts */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.LEGAL_FONTS_TITLE}
        </ThemedText>

        {/* Arabic Fonts */}
        <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
          {STRINGS.LEGAL_FONTS_ARABIC_TITLE}
        </ThemedText>

        <ThemedText type="body" weight="medium" style={styles.fontName}>
          {STRINGS.LEGAL_FONT_SCHEHERAZADE}
        </ThemedText>
        <ThemedText type="body" colorName="textTertiary" style={styles.fontDesc}>
          {STRINGS.LEGAL_FONT_SCHEHERAZADE_DESC}
        </ThemedText>

        <ThemedText type="body" weight="medium" style={styles.fontName}>
          {STRINGS.LEGAL_FONT_AMIRI}
        </ThemedText>
        <ThemedText type="body" colorName="textTertiary" style={styles.fontDesc}>
          {STRINGS.LEGAL_FONT_AMIRI_DESC}
        </ThemedText>

        <ThemedText type="body" weight="medium" style={styles.fontName}>
          {STRINGS.LEGAL_FONT_MADINA}
        </ThemedText>
        <ThemedText type="body" colorName="textTertiary" style={styles.fontDesc}>
          {STRINGS.LEGAL_FONT_MADINA_DESC}
        </ThemedText>

        <ThemedText type="body" weight="medium" style={styles.fontName}>
          {STRINGS.LEGAL_FONT_NASTALIQ}
        </ThemedText>
        <ThemedText type="body" colorName="textTertiary" style={styles.fontDesc}>
          {STRINGS.LEGAL_FONT_NASTALIQ_DESC}
        </ThemedText>

        {/* English Fonts */}
        <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
          {STRINGS.LEGAL_FONTS_ENGLISH_TITLE}
        </ThemedText>

        <ThemedText type="body" weight="medium" style={styles.fontName}>
          {STRINGS.LEGAL_FONT_NOTO_SANS}
        </ThemedText>
        <ThemedText type="body" colorName="textTertiary" style={styles.fontDesc}>
          {STRINGS.LEGAL_FONT_NOTO_SANS_DESC}
        </ThemedText>

        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.LEGAL_FONTS_SYSTEM_NOTE}
        </ThemedText>

        {/* License Information */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.LEGAL_LICENSE_INFO}
        </ThemedText>

        <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
          {STRINGS.LEGAL_SIL_OFL_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.LEGAL_SIL_OFL_DESC}
        </ThemedText>

        {/* Open Source Libraries */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.LEGAL_OPEN_SOURCE_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.lastParagraph}>
          {STRINGS.LEGAL_OPEN_SOURCE_DESC}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  sectionTitle: {
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  subsectionTitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  paragraph: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    lineHeight: 22,
  },
  lastParagraph: {
    lineHeight: 22,
  },
  linkContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  link: {
    textDecorationLine: 'underline',
  },
  fontName: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  fontDesc: {
    marginBottom: LAYOUT.SPACING.TINY,
    fontSize: 14,
  },
});

export default LegalAttributionsScreen;
