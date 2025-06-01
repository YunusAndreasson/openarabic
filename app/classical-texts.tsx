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

const ClassicalTextsScreen: React.FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Why Classical Texts',
          headerTitleStyle: {
            ...LAYOUT.HEADER.TITLE.SECONDARY,
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerTransparent: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Learning Guide',
          headerBackTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          },
        }}
      />

      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        accessibilityLabel="Why classical texts screen"
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
          {/* Introduction */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Why Classical Texts
            </ThemedText>
            <ThemedText type="body" style={styles.bodyText}>
              Classical Islamic texts with translations provide optimal conditions for Arabic
              acquisition through comprehensible input.
            </ThemedText>
          </View>

          {/* Benefits */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              What You Get
            </ThemedText>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons name="library-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText type="body" style={styles.benefitText}>
                    <ThemedText weight="bold">Complete linguistic system</ThemedText>
                    {'\n'}All Arabic grammatical structures in authentic contexts
                  </ThemedText>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons name="book-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText type="body" style={styles.benefitText}>
                    <ThemedText weight="bold">Rich vocabulary input</ThemedText>
                    {'\n'}Thousands of words in meaningful, comprehensible contexts
                  </ThemedText>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons name="language-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText type="body" style={styles.benefitText}>
                    <ThemedText weight="bold">Authentic language patterns</ThemedText>
                    {'\n'}Arabic as actually written and used by native speakers
                  </ThemedText>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons name="bulb-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText type="body" style={styles.benefitText}>
                    <ThemedText weight="bold">Cultural and conceptual framework</ThemedText>
                    {'\n'}Understanding of Arabic thought patterns and expression
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Addressing Concerns */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Common Concerns
            </ThemedText>

            <View style={styles.concernsList}>
              <View style={styles.concernItem}>
                <View style={[styles.concernIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.concernContent}>
                  <ThemedText type="body" weight="bold" style={styles.concernTitle}>
                    "Too difficult without grammar study"
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.concernText}>
                    Translations provide comprehensible input while exposing you to authentic
                    structures. Krashen's research shows grammar is acquired, not learned.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.concernItem}>
                <View style={[styles.concernIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons name="heart-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.concernContent}>
                  <ThemedText type="body" weight="bold" style={styles.concernTitle}>
                    "Content is too advanced"
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.concernText}>
                    Personal interest lowers the affective filter and improves acquisition. Familiar
                    concepts create optimal i+1 conditions.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Comparison */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Classical vs Modern Arabic
            </ThemedText>

            <View style={styles.comparisonList}>
              <View style={styles.comparisonItem}>
                <View style={[styles.comparisonIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons name="library-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.comparisonContent}>
                  <ThemedText type="body" weight="bold" style={styles.comparisonTitle}>
                    Classical Arabic
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.comparisonText}>
                    Foundation of all Arabic varieties. Enables reading Quran, hadith, literature,
                    formal writing, and news.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.comparisonItem}>
                <View style={[styles.comparisonIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.comparisonContent}>
                  <ThemedText type="body" weight="bold" style={styles.comparisonTitle}>
                    Modern Standard Arabic
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.comparisonText}>
                    Simplified classical Arabic for contemporary media and formal contexts. Easy
                    transition from classical foundation.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Process */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              How Acquisition Works
            </ThemedText>
            <ThemedText type="body" style={styles.bodyText}>
              Consistent exposure to comprehensible input builds linguistic competence over time.
              Each reading session contributes to your developing Arabic system through unconscious
              acquisition.
            </ThemedText>
            <ThemedText type="body" style={styles.bodyText}>
              This approach has successfully taught Arabic for centuries. Modern SLA research
              validates combining authentic texts with translation support for optimal
              comprehensible input.
            </ThemedText>
          </View>

          {/* Scientific References */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Research Support
            </ThemedText>

            <View style={styles.referencesList}>
              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText type="body" weight="bold" style={styles.referenceTitle}>
                    Input Hypothesis
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.referenceText}>
                    Krashen, S. (1985). The Input Hypothesis: Issues and Implications. Demonstrates
                    that comprehensible input is the primary driver of language acquisition.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText type="body" weight="bold" style={styles.referenceTitle}>
                    Affective Filter Hypothesis
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.referenceText}>
                    Krashen, S. (1982). Principles and Practice in Second Language Acquisition.
                    Shows how motivation and low anxiety enable optimal language acquisition.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.tint} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText type="body" weight="bold" style={styles.referenceTitle}>
                    Natural Approach
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.referenceText}>
                    Krashen, S. & Terrell, T. (1983). The Natural Approach. Demonstrates effective
                    language teaching through comprehensible input and meaningful content.
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
    paddingHorizontal: 0,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },

  // Section Styles
  section: {
    marginBottom: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.1,
    marginBottom: LAYOUT.SPACING.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
  },
  bodyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.05,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.7,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  // Concerns List
  concernsList: {
    gap: LAYOUT.SPACING.LARGE,
  },
  concernItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  concernIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  concernContent: {
    flex: 1,
  },
  concernTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  concernText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },

  // Benefits List
  benefitsList: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
    flex: 1,
  },

  // Comparison List
  comparisonList: {
    gap: LAYOUT.SPACING.LARGE,
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  comparisonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  comparisonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },

  // References List
  referencesList: {
    gap: LAYOUT.SPACING.LARGE,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  referenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  referenceContent: {
    flex: 1,
  },
  referenceTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  referenceText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },
});

export default ClassicalTextsScreen;
