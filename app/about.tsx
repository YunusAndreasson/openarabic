// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

const AboutScreen: React.FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="About screen"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + LAYOUT.SPACING.MEDIUM }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText type="heading2" weight="bold" style={styles.headerTitle}>
          About
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ThemedView
        useSafeArea={false}
        includeBottomInset={false}
        style={styles.flexOne}
        scrollable={true}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Main Content */}
        <View style={styles.contentWrapper}>
          {/* Mission Section */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Our Mission
            </ThemedText>
            <ThemedText type="body" style={[styles.paragraph, { fontFamily: 'Philosopher' }]}>
              We make classical Islamic scholarship accessible through immersive reading and
              listening. Authentic texts from renowned scholars, with Arabic and English side by
              side.
            </ThemedText>
          </View>

          {/* How It Works Section */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              How It Works
            </ThemedText>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="book" size={20} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <ThemedText type="body" weight="medium" style={styles.featureTitle}>
                  Read & Bookmark
                </ThemedText>
                <ThemedText
                  type="body"
                  variant="secondary"
                  style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                >
                  Browse curated articles with clear Arabic typography and optional translations.
                  Save articles for later reading.
                </ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="headset" size={20} color={colors.success} />
              </View>
              <View style={styles.featureContent}>
                <ThemedText type="body" weight="medium" style={styles.featureTitle}>
                  Listen & Learn
                </ThemedText>
                <ThemedText
                  type="body"
                  variant="secondary"
                  style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                >
                  High-quality audio narration helps you develop proper pronunciation and listening
                  skills.
                </ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="library" size={20} color={colors.warning} />
              </View>
              <View style={styles.featureContent}>
                <ThemedText type="body" weight="medium" style={styles.featureTitle}>
                  Build Vocabulary
                </ThemedText>
                <ThemedText
                  type="body"
                  variant="secondary"
                  style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                >
                  Tap unfamiliar words to add them to your personal collection with context and
                  meaning.
                </ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="refresh" size={20} color={colors.info} />
              </View>
              <View style={styles.featureContent}>
                <ThemedText type="body" weight="medium" style={styles.featureTitle}>
                  Active Recall
                </ThemedText>
                <ThemedText
                  type="body"
                  variant="secondary"
                  style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                >
                  Spaced repetition system uses active recall to move vocabulary into long-term
                  memory.
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Quote Section */}
          <View style={[styles.quoteSection, { backgroundColor: colors.cardBackground }]}>
            <ThemedText
              type="arabic"
              arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XLARGE}
              align="center"
              style={styles.arabicQuote}
              skipDefaultColor
              colorName="arabicText"
            >
              وَقُل رَّبِّ زِدْنِي عِلْمًا
            </ThemedText>
            <ThemedText
              type="body"
              variant="secondary"
              align="center"
              style={[styles.quoteTranslation, { fontFamily: 'Philosopher' }]}
            >
              "My Lord, increase me in knowledge"
            </ThemedText>
            <ThemedText
              type="caption"
              variant="subtle"
              align="center"
              style={styles.quoteReference}
            >
              Quran 20:114
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  backButton: {
    padding: LAYOUT.SPACING.SMALL,
    marginLeft: -LAYOUT.SPACING.SMALL,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  headerSpacer: {
    width: 24 + LAYOUT.SPACING.SMALL * 2,
  },
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  contentWrapper: {
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  section: {
    marginBottom: LAYOUT.SPACING.XLARGE * 1.5,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    letterSpacing: 0.4,
  },
  paragraph: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.05,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.7,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.05,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  featureDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.6,
  },
  quoteSection: {
    padding: LAYOUT.SPACING.XLARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
    marginHorizontal: 0,
  },
  arabicQuote: {
    marginBottom: LAYOUT.SPACING.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.3,
  },
  quoteTranslation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    fontStyle: 'italic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  quoteReference: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.6,
  },
});

export default AboutScreen;
