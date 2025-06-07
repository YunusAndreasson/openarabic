// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

const ClassicalTextsScreen: React.FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTitleStyle: {
            ...LAYOUT.HEADER.TITLE.SECONDARY,
            color: colors.text,
          } as any,
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
        accessibilityLabel="Why classical texts screen"
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        style={styles.container}
      >
        <ThemedView
          includeBottomInset={false}
          scrollable={true}
          style={styles.flexOne}
          useSafeArea={false}
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
          {/* Custom Header */}
          <View style={styles.customHeader}>
            <ThemedText style={styles.customHeaderTitle} type="heading1" weight="bold">
              Why Classical Texts Work Best
            </ThemedText>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <ThemedText style={styles.bodyText} type="body">
              Classical Islamic texts with translations provide optimal conditions for Arabic
              acquisition through comprehensible input.
            </ThemedText>
          </View>

          {/* Benefits */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
              What You Get
            </ThemedText>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons color={colors.tint} name="library-outline" size={20} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText style={styles.benefitText} type="body">
                    <ThemedText weight="bold">Complete linguistic system</ThemedText>
                    {'\n'}All Arabic grammatical structures in authentic contexts
                  </ThemedText>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons color={colors.tint} name="book-outline" size={20} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText style={styles.benefitText} type="body">
                    <ThemedText weight="bold">Rich vocabulary input</ThemedText>
                    {'\n'}Thousands of words in meaningful, comprehensible contexts
                  </ThemedText>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons color={colors.tint} name="language-outline" size={20} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText style={styles.benefitText} type="body">
                    <ThemedText weight="bold">Authentic language patterns</ThemedText>
                    {'\n'}Arabic as actually written and used by native speakers
                  </ThemedText>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons color={colors.tint} name="bulb-outline" size={20} />
                </View>
                <View style={styles.benefitContent}>
                  <ThemedText style={styles.benefitText} type="body">
                    <ThemedText weight="bold">Cultural and conceptual framework</ThemedText>
                    {'\n'}Understanding of Arabic thought patterns and expression
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Addressing Concerns */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
              Common Concerns
            </ThemedText>

            <View style={styles.concernsList}>
              <View style={styles.concernItem}>
                <View style={[styles.concernIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons color={colors.tint} name="shield-checkmark-outline" size={20} />
                </View>
                <View style={styles.concernContent}>
                  <ThemedText style={styles.concernTitle} type="body" weight="bold">
                    &quot;Too difficult without grammar study&quot;
                  </ThemedText>
                  <ThemedText style={styles.concernText} type="body" variant="secondary">
                    Translations provide comprehensible input while exposing you to authentic
                    structures. Krashens research shows grammar is acquired, not learned.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.concernItem}>
                <View style={[styles.concernIcon, { backgroundColor: colors.buttonOverlay }]}>
                  <Ionicons color={colors.tint} name="heart-outline" size={20} />
                </View>
                <View style={styles.concernContent}>
                  <ThemedText style={styles.concernTitle} type="body" weight="bold">
                    &quot;Content is too advanced&quot;
                  </ThemedText>
                  <ThemedText style={styles.concernText} type="body" variant="secondary">
                    Personal interest lowers the affective filter and improves acquisition. Familiar
                    concepts create optimal i+1 conditions.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Comparison */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
              Classical vs Modern Arabic
            </ThemedText>

            <View style={styles.comparisonList}>
              <View style={styles.comparisonItem}>
                <View style={[styles.comparisonIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons color={colors.tint} name="library-outline" size={20} />
                </View>
                <View style={styles.comparisonContent}>
                  <ThemedText style={styles.comparisonTitle} type="body" weight="bold">
                    Classical Arabic
                  </ThemedText>
                  <ThemedText style={styles.comparisonText} type="body" variant="secondary">
                    Foundation of all Arabic varieties. Enables reading Quran, hadith, literature,
                    formal writing, and news.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.comparisonItem}>
                <View style={[styles.comparisonIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons color={colors.tint} name="chatbubble-outline" size={20} />
                </View>
                <View style={styles.comparisonContent}>
                  <ThemedText style={styles.comparisonTitle} type="body" weight="bold">
                    Modern Standard Arabic
                  </ThemedText>
                  <ThemedText style={styles.comparisonText} type="body" variant="secondary">
                    Simplified classical Arabic for contemporary media and formal contexts. Easy
                    transition from classical foundation.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Process */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
              How Acquisition Works
            </ThemedText>
            <ThemedText style={styles.bodyText} type="body">
              Consistent exposure to comprehensible input builds linguistic competence over time.
              Each reading session contributes to your developing Arabic system through unconscious
              acquisition.
            </ThemedText>
            <ThemedText style={styles.bodyText} type="body">
              This approach has successfully taught Arabic for centuries. Modern SLA research
              validates combining authentic texts with translation support for optimal
              comprehensible input.
            </ThemedText>
          </View>

          {/* Scientific References */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
              Research Support
            </ThemedText>

            <View style={styles.referencesList}>
              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons color={colors.tint} name="document-text-outline" size={20} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                    Input Hypothesis
                  </ThemedText>
                  <ThemedText style={styles.referenceText} type="body" variant="secondary">
                    Krashen, S. (1985). The Input Hypothesis: Issues and Implications. Demonstrates
                    that comprehensible input is the primary driver of language acquisition.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons color={colors.tint} name="document-text-outline" size={20} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                    Affective Filter Hypothesis
                  </ThemedText>
                  <ThemedText style={styles.referenceText} type="body" variant="secondary">
                    Krashen, S. (1982). Principles and Practice in Second Language Acquisition.
                    Shows how motivation and low anxiety enable optimal language acquisition.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.elevation2 }]}>
                  <Ionicons color={colors.tint} name="document-text-outline" size={20} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                    Natural Approach
                  </ThemedText>
                  <ThemedText style={styles.referenceText} type="body" variant="secondary">
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
    marginBottom: LAYOUT.SPACING.LARGE,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  concernIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: 40,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  benefitIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: 40,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },

  // Comparison List
  comparisonList: {
    gap: LAYOUT.SPACING.LARGE,
  },
  comparisonItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  comparisonIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: 40,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  referenceIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: 40,
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

  // Custom Header Styles
  customHeader: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  customHeaderTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.3,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});

export default ClassicalTextsScreen;
