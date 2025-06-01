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

const LearningMethodScreen: React.FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Why This Works',
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
        accessibilityLabel="Why this learning method works"
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
              How Language Acquisition Works
            </ThemedText>
            <ThemedText type="body" style={styles.bodyText}>
              Language acquisition occurs through understanding meaningful messages, not grammar
              instruction. According to Krashen's Input Hypothesis, the brain naturally identifies
              patterns through exposure to comprehensible input.
            </ThemedText>
          </View>

          {/* Process */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              The Acquisition Process
            </ThemedText>

            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="eye-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                    Comprehensible input (i+1)
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.stepText}>
                    Translations provide meaning context while exposing you to Arabic structures
                    just beyond your current level.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="bulb-outline" size={20} color={colors.success} />
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                    Unconscious pattern recognition
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.stepText}>
                    The brain automatically identifies recurring structures without conscious
                    analysis or grammar study.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="refresh-outline" size={20} color={colors.warning} />
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                    Natural order acquisition
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.stepText}>
                    Language structures are acquired in a predictable sequence through repeated
                    meaningful exposure.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.errorLight }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.error} />
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" weight="bold" style={styles.stepTitle}>
                    Internalized competence
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.stepText}>
                    Arabic structures become part of your acquired language system, enabling fluent
                    use.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Why Classical Texts */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Why Classical Islamic Texts
            </ThemedText>

            <View style={styles.reasonsList}>
              <View style={styles.reasonItem}>
                <View style={[styles.reasonIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="heart-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.reasonContent}>
                  <ThemedText type="body" weight="bold" style={styles.reasonTitle}>
                    Low affective filter
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.reasonText}>
                    Personal interest in content reduces anxiety and increases motivation, enabling
                    optimal acquisition.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.reasonItem}>
                <View style={[styles.reasonIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="library-outline" size={20} color={colors.success} />
                </View>
                <View style={styles.reasonContent}>
                  <ThemedText type="body" weight="bold" style={styles.reasonTitle}>
                    Rich linguistic input
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.reasonText}>
                    Complete Arabic grammatical system and extensive vocabulary in authentic,
                    meaningful contexts.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.reasonItem}>
                <View style={[styles.reasonIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="trending-up-outline" size={20} color={colors.warning} />
                </View>
                <View style={styles.reasonContent}>
                  <ThemedText type="body" weight="bold" style={styles.reasonTitle}>
                    Optimal comprehensibility
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.reasonText}>
                    Familiar concepts in Arabic with translation support create ideal i+1 conditions
                    for acquisition.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Research */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Research Foundation
            </ThemedText>
            <ThemedText type="body" style={styles.bodyText}>
              Krashen's Input Hypothesis demonstrates that comprehensible input is the primary
              mechanism for language acquisition. Research shows optimal learning occurs when
              learners understand 90-95% of content.
            </ThemedText>
          </View>

          {/* Practical Implications */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              What This Means
            </ThemedText>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <ThemedText type="body" style={styles.benefitText}>
                  • <ThemedText weight="bold">Acquisition, not learning</ThemedText> - Language
                  develops through understanding, not memorization
                </ThemedText>
              </View>
              <View style={styles.benefitItem}>
                <ThemedText type="body" style={styles.benefitText}>
                  • <ThemedText weight="bold">Focus on meaning</ThemedText> - Understanding messages
                  drives language development
                </ThemedText>
              </View>
              <View style={styles.benefitItem}>
                <ThemedText type="body" style={styles.benefitText}>
                  • <ThemedText weight="bold">Natural process</ThemedText> - Acquisition occurs
                  automatically with sufficient comprehensible input
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Scientific References */}
          <View style={styles.section}>
            <ThemedText type="heading2" weight="bold" style={styles.sectionTitle}>
              Scientific Foundation
            </ThemedText>

            <View style={styles.referencesList}>
              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText type="body" weight="bold" style={styles.referenceTitle}>
                    Krashen, S. (1985)
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.referenceText}>
                    The Input Hypothesis: Issues and Implications. Longman.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.success} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText type="body" weight="bold" style={styles.referenceTitle}>
                    Krashen, S. & Terrell, T. (1983)
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.referenceText}>
                    The Natural Approach: Language Acquisition in the Classroom. Prentice Hall.
                  </ThemedText>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <View style={[styles.referenceIcon, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.warning} />
                </View>
                <View style={styles.referenceContent}>
                  <ThemedText type="body" weight="bold" style={styles.referenceTitle}>
                    Lightbown, P. & Spada, N. (2013)
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.referenceText}>
                    How Languages are Learned (4th ed.). Oxford University Press.
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

  // Steps List
  stepsList: {
    gap: LAYOUT.SPACING.LARGE,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  stepText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },

  // Reasons List
  reasonsList: {
    gap: LAYOUT.SPACING.LARGE,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  reasonContent: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  reasonText: {
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
  benefitText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
    flex: 1,
  },

  // References List
  referencesList: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  referenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
  },
  referenceContent: {
    flex: 1,
  },
  referenceTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  referenceText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.6,
  },
});

export default LearningMethodScreen;
