// External Libraries
import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

const ClassicalTextsScreen: FC = () => {
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
            {STRINGS.CLASSICAL_TEXTS_INTRO}
          </ThemedText>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.WHAT_YOU_GET}
          </ThemedText>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons
                  color={colors.tint}
                  name="library-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.COMPLETE_LINGUISTIC_SYSTEM}</ThemedText>
                  {'\n'}
                  {STRINGS.COMPLETE_ARABIC_SYSTEM}
                </ThemedText>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons
                  color={colors.tint}
                  name="book-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.RICH_VOCABULARY_INPUT}</ThemedText>
                  {'\n'}
                  {STRINGS.RICH_VOCABULARY_INPUT_DESC}
                </ThemedText>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons
                  color={colors.tint}
                  name="language-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.AUTHENTIC_LANGUAGE_PATTERNS}</ThemedText>
                  {'\n'}
                  {STRINGS.AUTHENTIC_LANGUAGE_PATTERNS_DESC}
                </ThemedText>
              </View>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons
                  color={colors.tint}
                  name="bulb-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.benefitContent}>
                <ThemedText style={styles.benefitText} type="body">
                  <ThemedText weight="bold">{STRINGS.CULTURAL_AND_CONCEPTUAL_FRAMEWORK}</ThemedText>
                  {'\n'}
                  {STRINGS.CULTURAL_AND_CONCEPTUAL_FRAMEWORK_DESC}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Addressing Concerns */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.COMMON_CONCERNS}
          </ThemedText>

          <View style={styles.concernsList}>
            <View style={styles.concernItem}>
              <View style={[styles.concernIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons
                  color={colors.tint}
                  name="shield-checkmark-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.concernContent}>
                <ThemedText style={styles.concernTitle} type="body" weight="bold">
                  {STRINGS.TOO_DIFFICULT_WITHOUT_GRAMMAR}
                </ThemedText>
                <ThemedText style={styles.concernText} type="body" variant="secondary">
                  {STRINGS.TRANSLATIONS_PROVIDE_COMPREHENSION}
                </ThemedText>
              </View>
            </View>

            <View style={styles.concernItem}>
              <View style={[styles.concernIcon, { backgroundColor: colors.elevation2 }]}>
                <Ionicons
                  color={colors.tint}
                  name="heart-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.concernContent}>
                <ThemedText style={styles.concernTitle} type="body" weight="bold">
                  {STRINGS.CONTENT_TOO_ADVANCED}
                </ThemedText>
                <ThemedText style={styles.concernText} type="body" variant="secondary">
                  {STRINGS.PERSONAL_INTEREST_LOWERS_AFFECTIVE_FILTER}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Comparison */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.CLASSICAL_VS_MODERN_ARABIC}
          </ThemedText>

          <View style={styles.comparisonList}>
            <View style={styles.comparisonItem}>
              <View style={[styles.comparisonIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons
                  color={colors.tint}
                  name="library-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.comparisonContent}>
                <ThemedText style={styles.comparisonTitle} type="body" weight="bold">
                  {STRINGS.CLASSICAL_ARABIC}
                </ThemedText>
                <ThemedText style={styles.comparisonText} type="body" variant="secondary">
                  {STRINGS.CLASSICAL_ARABIC_DESC}
                </ThemedText>
              </View>
            </View>

            <View style={styles.comparisonItem}>
              <View style={[styles.comparisonIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons
                  color={colors.tint}
                  name="chatbubble-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.comparisonContent}>
                <ThemedText style={styles.comparisonTitle} type="body" weight="bold">
                  {STRINGS.MODERN_STANDARD_ARABIC}
                </ThemedText>
                <ThemedText style={styles.comparisonText} type="body" variant="secondary">
                  {STRINGS.MODERN_STANDARD_ARABIC_DESC}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Process */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.THE_ACQUISITION_PROCESS}
          </ThemedText>
          <ThemedText style={styles.bodyText} type="body">
            {STRINGS.PROCESS_EXPOSURE_BUILDS_COMPETENCE}
          </ThemedText>
          <ThemedText style={styles.bodyText} type="body">
            {STRINGS.APPROACH_VALIDATED_BY_RESEARCH}
          </ThemedText>
        </View>

        {/* Scientific References */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle} type="heading2" weight="bold">
            {STRINGS.RESEARCH_SUPPORT}
          </ThemedText>

          <View style={styles.referencesList}>
            <View style={styles.referenceItem}>
              <View style={[styles.referenceIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons
                  color={colors.tint}
                  name="document-text-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.referenceContent}>
                <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                  {STRINGS.INPUT_HYPOTHESIS}
                </ThemedText>
                <ThemedText style={styles.referenceText} type="body" variant="secondary">
                  {STRINGS.RESEARCH_REF_KRASHEN_1985}
                </ThemedText>
              </View>
            </View>

            <View style={styles.referenceItem}>
              <View style={[styles.referenceIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons
                  color={colors.tint}
                  name="document-text-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.referenceContent}>
                <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                  {STRINGS.AFFECTIVE_FILTER_HYPOTHESIS}
                </ThemedText>
                <ThemedText style={styles.referenceText} type="body" variant="secondary">
                  {STRINGS.RESEARCH_REF_AFFECTIVE_FILTER_HYPOTHESIS}
                </ThemedText>
              </View>
            </View>

            <View style={styles.referenceItem}>
              <View style={[styles.referenceIcon, { backgroundColor: colors.elevation1 }]}>
                <Ionicons
                  color={colors.tint}
                  name="document-text-outline"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              </View>
              <View style={styles.referenceContent}>
                <ThemedText style={styles.referenceTitle} type="body" weight="bold">
                  {STRINGS.NATURAL_APPROACH}
                </ThemedText>
                <ThemedText style={styles.referenceText} type="body" variant="secondary">
                  {STRINGS.RESEARCH_REF_KRASHEN_TERRELL_1983}
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.TIGHT,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  bodyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MICRO * 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
  },
  concernContent: {
    flex: 1,
  },
  concernTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  concernText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
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
    marginTop: LAYOUT.SPACING.MICRO * 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MICRO * 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  comparisonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MICRO * 2,
    width: MIN_TOUCH_TARGET.LARGE - LAYOUT.SPACING.SMALL,
  },
  referenceContent: {
    flex: 1,
  },
  referenceTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  referenceText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
  },
});

export default ClassicalTextsScreen;
