import type { JSX } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@common/SectionTitle';
import { EfficiencyChart, MasteryChart, RetrievabilityChart } from '@practice/charts';

import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

// Title mapping for charts
const TITLES = {
  mastery: STRINGS.WORD_MASTERY,
  efficiency: STRINGS.LEARNING_PROGRESS,
  retrievability: STRINGS.REVIEW_TIMING,
} as const;

export default function StudyStatsScreen(): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { allWords: studyWords, error } = useFSRSQueries({
    userId: user?.id,
  });

  const validStudyWords = useMemo(
    () => studyWords?.filter(word => word != null && word.root_id != null) ?? [],
    [studyWords]
  );

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Animated.View
          entering={FadeIn.duration(LAYOUT.ANIMATION.DURATION.SLOW)}
          style={[styles.errorContainer, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle title={STRINGS.INSIGHTS_UNAVAILABLE} />
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView
        scrollable={true}
        useSafeArea={false}
        includeBottomInset={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.SMALL },
        ]}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          overScrollMode: 'never',
          bounces: true,
        }}
      >
        <View style={styles.chartSection}>
          <SectionTitle
            title={TITLES.mastery}
            subtitle={STRINGS.MEMORY_STRENGTH_ACROSS_VOCABULARY}
            isFirstSection
          />
          <MasteryChart studyWords={validStudyWords} hideTitle={true} />
        </View>

        <View style={styles.chartSection}>
          <SectionTitle
            title={TITLES.efficiency}
            subtitle={STRINGS.VOCABULARY_ACQUISITION_VELOCITY}
          />
          <EfficiencyChart studyWords={validStudyWords} hideTitle={true} />
        </View>

        <View style={styles.chartSection}>
          <SectionTitle
            title={TITLES.retrievability}
            subtitle={STRINGS.MEMORY_RETENTION_OPTIMAL_TIMING}
          />
          <RetrievabilityChart studyWords={validStudyWords} hideTitle={true} />
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  chartSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  errorContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    flex: 1,
    justifyContent: 'center',
    margin: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.XXLARGE,
    ...LAYOUT.ELEVATION.SMALL,
  },
});
