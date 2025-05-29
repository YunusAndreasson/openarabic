// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

const AboutScreen: React.FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'About',
          headerTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 1,
            fontWeight: '700',
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTransparent: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Settings',
          headerBackTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          },
        }}
      />

      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        accessibilityLabel="About screen"
      >
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
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.heroCard, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.heroIconContainer, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="library-outline" size={34} color={colors.primary} />
              </View>
              <ThemedText type="heading1" weight="bold" style={styles.heroTitle} align="center">
                Classical Islamic Learning
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.heroDescription, { fontFamily: 'Philosopher' }]}
                align="center"
                variant="secondary"
              >
                Master Arabic through authentic classical texts. Read, listen, learn, and retain
                vocabulary from the greatest Islamic scholars in history.
              </ThemedText>
            </View>
          </View>

          {/* Quote Section */}
          <View style={[styles.quoteSection, { backgroundColor: colors.cardBackground }]}>
            <ThemedText
              type="arabic"
              arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.3}
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

          {/* Five Pillars Section */}
          <View style={styles.featuresSection}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Five Pillars of Learning
            </ThemedText>

            <View style={[styles.featuresGrid, { backgroundColor: colors.cardBackground }]}>
              {/* Read Feature */}
              <View style={styles.featureCard}>
                <View style={[styles.featureIconLarge, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="reader-outline" size={26} color={colors.primary} />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="body" weight="bold" style={styles.featureTitle}>
                    Read Authentic Texts
                  </ThemedText>
                  <ThemedText
                    type="body"
                    variant="secondary"
                    style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                  >
                    Access classical Islamic scholarship with pristine Arabic typography and precise
                    English translations side by side.
                  </ThemedText>
                </View>
              </View>

              {/* Listen Feature */}
              <View style={styles.featureCard}>
                <View style={[styles.featureIconLarge, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="headset-outline" size={26} color={colors.success} />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="body" weight="bold" style={styles.featureTitle}>
                    Listen to Narration
                  </ThemedText>
                  <ThemedText
                    type="body"
                    variant="secondary"
                    style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                  >
                    Professional Arabic narration trains your ear and develops proper pronunciation
                    through repetition and immersion.
                  </ThemedText>
                </View>
              </View>

              {/* Vocabulary Feature */}
              <View style={styles.featureCard}>
                <View style={[styles.featureIconLarge, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="chatbubbles-outline" size={26} color={colors.warning} />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="body" weight="bold" style={styles.featureTitle}>
                    Build Vocabulary
                  </ThemedText>
                  <ThemedText
                    type="body"
                    variant="secondary"
                    style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                  >
                    Tap any word to save it with full context. Build your personal Arabic dictionary
                    from real scholarly usage.
                  </ThemedText>
                </View>
              </View>

              {/* Bookmark Feature */}
              <View style={styles.featureCard}>
                <View style={[styles.featureIconLarge, { backgroundColor: colors.infoLight }]}>
                  <Ionicons name="bookmark-outline" size={26} color={colors.info} />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="body" weight="bold" style={styles.featureTitle}>
                    Save for Later
                  </ThemedText>
                  <ThemedText
                    type="body"
                    variant="secondary"
                    style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                  >
                    Bookmark articles instantly. Return to continue reading or listening from
                    exactly where you left off.
                  </ThemedText>
                </View>
              </View>

              {/* Review Feature */}
              <View style={[styles.featureCard, styles.lastFeatureCard]}>
                <View
                  style={[
                    styles.featureIconLarge,
                    { backgroundColor: colors.dangerLight || colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={26}
                    color={colors.danger || colors.primary}
                  />
                </View>
                <View style={styles.featureContent}>
                  <ThemedText type="body" weight="bold" style={styles.featureTitle}>
                    Review & Retain
                  </ThemedText>
                  <ThemedText
                    type="body"
                    variant="secondary"
                    style={[styles.featureDescription, { fontFamily: 'Philosopher' }]}
                  >
                    Spaced repetition moves vocabulary from short-term to permanent memory. Review
                    at scientifically optimal intervals.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </ThemedView>
      </ThemedView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },

  // Hero Section
  heroSection: {
    marginBottom: LAYOUT.SPACING.XLARGE * 1.8,
  },
  heroCard: {
    padding: LAYOUT.SPACING.XLARGE * 1.4,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE * 1.2,
  },
  heroTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.5,
    marginBottom: LAYOUT.SPACING.LARGE,
    letterSpacing: 0.3,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.8,
  },
  heroDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.15,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.8,
    maxWidth: '92%',
  },

  // Quote Section
  quoteSection: {
    padding: LAYOUT.SPACING.XLARGE * 1.4,
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    marginBottom: LAYOUT.SPACING.XLARGE * 1.8,
    marginHorizontal: LAYOUT.SPACING.SMALL,
  },
  arabicQuote: {
    marginBottom: LAYOUT.SPACING.LARGE * 1.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6,
  },
  quoteTranslation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.25,
    marginBottom: LAYOUT.SPACING.MEDIUM * 1.2,
    fontStyle: 'italic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.8,
  },
  quoteReference: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.15,
    letterSpacing: 0.8,
    opacity: 0.75,
  },

  // Features Section
  featuresSection: {
    marginBottom: LAYOUT.SPACING.XLARGE * 2,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.3,
    marginBottom: LAYOUT.SPACING.XLARGE * 1.2,
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6,
  },
  featuresGrid: {
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
    padding: LAYOUT.SPACING.XLARGE,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.SPACING.XLARGE * 1.2,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  lastFeatureCard: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  featureIconLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.LARGE * 1.2,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  featureContent: {
    flex: 1,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  featureTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    marginBottom: LAYOUT.SPACING.MEDIUM * 1.2,
    letterSpacing: 0.3,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },
  featureDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.05,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.8,
  },
});

export default AboutScreen;
