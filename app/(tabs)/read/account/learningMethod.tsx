// External Libraries
import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

const LearningMethodScreen: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
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
        {/* Introduction */}
        <View style={styles.section}>
          <ThemedText style={styles.bodyText} type="body">
            Language acquisition occurs through understanding meaningful messages, not grammar
            instruction. According to Krashens Input Hypothesis, the brain naturally identifies
            patterns through exposure to comprehensible input.
          </ThemedText>
        </View>

        {/* Process */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.THE_ACQUISITION_PROCESS}
          </ThemedText>

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="eye-outline" size={20} />
              </View>
              <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle} type="body" weight="bold">
                  {STRINGS.COMPREHENSIBLE_INPUT}
                </ThemedText>
                <ThemedText style={styles.stepText} type="body" variant="secondary">
                  Translations provide meaning context while exposing you to Arabic structures just
                  beyond your current level.
                </ThemedText>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="bulb-outline" size={20} />
              </View>
              <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle} type="body" weight="bold">
                  {STRINGS.UNCONSCIOUS_PATTERN_RECOGNITION}
                </ThemedText>
                <ThemedText style={styles.stepText} type="body" variant="secondary">
                  The brain automatically identifies recurring structures without conscious analysis
                  or grammar study.
                </ThemedText>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="refresh-outline" size={20} />
              </View>
              <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle} type="body" weight="bold">
                  {STRINGS.NATURAL_ORDER_ACQUISITION}
                </ThemedText>
                <ThemedText style={styles.stepText} type="body" variant="secondary">
                  Language structures are acquired in a predictable sequence through repeated
                  meaningful exposure.
                </ThemedText>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="checkmark-circle-outline" size={20} />
              </View>
              <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle} type="body" weight="bold">
                  {STRINGS.INTERNALIZED_COMPETENCE}
                </ThemedText>
                <ThemedText style={styles.stepText} type="body" variant="secondary">
                  Arabic structures become part of your acquired language system, enabling fluent
                  use.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Why Classical Texts */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.WHY_CLASSICAL_ISLAMIC_TEXTS}
          </ThemedText>

          <View style={styles.reasonsList}>
            <View style={styles.reasonItem}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="heart-outline" size={20} />
              </View>
              <View style={styles.reasonContent}>
                <ThemedText style={styles.reasonTitle} type="body" weight="bold">
                  {STRINGS.LOW_AFFECTIVE_FILTER}
                </ThemedText>
                <ThemedText style={styles.reasonText} type="body" variant="secondary">
                  Personal interest in content reduces anxiety and increases motivation, enabling
                  optimal acquisition.
                </ThemedText>
              </View>
            </View>

            <View style={styles.reasonItem}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="library-outline" size={20} />
              </View>
              <View style={styles.reasonContent}>
                <ThemedText style={styles.reasonTitle} type="body" weight="bold">
                  {STRINGS.RICH_LINGUISTIC_INPUT_TITLE}
                </ThemedText>
                <ThemedText style={styles.reasonText} type="body" variant="secondary">
                  Complete Arabic grammatical system and extensive vocabulary in authentic,
                  meaningful contexts.
                </ThemedText>
              </View>
            </View>

            <View style={styles.reasonItem}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="trending-up-outline" size={20} />
              </View>
              <View style={styles.reasonContent}>
                <ThemedText style={styles.reasonTitle} type="body" weight="bold">
                  {STRINGS.OPTIMAL_COMPREHENSIBILITY}
                </ThemedText>
                <ThemedText style={styles.reasonText} type="body" variant="secondary">
                  Familiar concepts in Arabic with translation support create ideal i+1 conditions
                  for acquisition.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Research */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.RESEARCH_FOUNDATION}
          </ThemedText>
          <ThemedText style={styles.bodyText} type="body">
            Krashens Input Hypothesis demonstrates that comprehensible input is the primary
            mechanism for language acquisition. Research shows optimal learning occurs when learners
            understand 90-95% of content.
          </ThemedText>
        </View>

        {/* Practical Implications */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.WHAT_THIS_MEANS}
          </ThemedText>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="bulb-outline" size={20} />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.ACQUISITION_NOT_LEARNING}</ThemedText>
                  {'\n'}Language develops through understanding, not memorization
                </ThemedText>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="eye-outline" size={20} />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.FOCUS_ON_MEANING}</ThemedText>
                  {'\n'}Understanding messages drives language development
                </ThemedText>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons color={colors.tint} name="leaf-outline" size={20} />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.NATURAL_PROCESS}</ThemedText>
                  {'\n'}Acquisition occurs automatically with sufficient comprehensible input
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Scientific References */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.SCIENTIFIC_FOUNDATION}
          </ThemedText>

          <View style={styles.referencesList}>
            <View style={styles.referenceItem}>
              <View style={[styles.referenceIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons color={colors.tint} name="document-text-outline" size={20} />
              </View>
              <View style={styles.referenceContent}>
                <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                  Krashen, S. (1985)
                </ThemedText>
                <ThemedText style={styles.referenceText} type="body" variant="secondary">
                  The Input Hypothesis: Issues and Implications. Longman.
                </ThemedText>
              </View>
            </View>

            <View style={styles.referenceItem}>
              <View style={[styles.referenceIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons color={colors.tint} name="document-text-outline" size={20} />
              </View>
              <View style={styles.referenceContent}>
                <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                  Krashen, S. & Terrell, T. (1983)
                </ThemedText>
                <ThemedText style={styles.referenceText} type="body" variant="secondary">
                  The Natural Approach: Language Acquisition in the Classroom. Prentice Hall.
                </ThemedText>
              </View>
            </View>

            <View style={styles.referenceItem}>
              <View style={[styles.referenceIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons color={colors.tint} name="document-text-outline" size={20} />
              </View>
              <View style={styles.referenceContent}>
                <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                  Lightbown, P. & Spada, N. (2013)
                </ThemedText>
                <ThemedText style={styles.referenceText} type="body" variant="secondary">
                  How Languages are Learned (4th ed.). Oxford University Press.
                </ThemedText>
              </View>
            </View>
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
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  stepIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  reasonIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  benefitIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },

  // References List
  referencesList: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  referenceItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  referenceIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
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
