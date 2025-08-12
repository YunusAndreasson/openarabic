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
// import { useEfficiencyChart } from '@/hooks/vocabulary/useEfficiencyChart';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
// import { useMasteryChart } from '@/hooks/vocabulary/useMasteryChart';
// import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';

import { INFO_TITLES } from './_layout';

export default function InsightsScreen(): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  // Use the FSRS queries hook for data fetching
  const { allWords: studyWords, error } = useFSRSQueries({
    userId: user?.id,
  });

  // Filter valid study words
  const validStudyWords = useMemo(
    () => studyWords?.filter(word => word != null && word.root_id != null) ?? [],
    [studyWords]
  );

  // Chart components now show their own inline current values

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
          {
            // Reduce excessive bottom space: only safe area + small spacing
            paddingBottom: insets.bottom + LAYOUT.SPACING.SMALL,
          },
        ]}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          overScrollMode: 'never',
          bounces: true,
        }}
      >
        {/* Introductory context removed for cleaner, faster comprehension */}

        {/* Word Mastery Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title={INFO_TITLES.mastery}
            subtitle={STRINGS.MEMORY_STRENGTH_ACROSS_VOCABULARY}
            isFirstSection={true}
          />
          {/* Metric caption removed; inline badge inside chart shows current value */}
          <MasteryChart studyWords={validStudyWords} hideTitle={true} />
        </View>

        {/* Learning Progress Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title={INFO_TITLES.efficiency}
            subtitle={STRINGS.VOCABULARY_ACQUISITION_VELOCITY}
          />
          {/* Numeric summary moved into chart as inline last-value badge */}
          <EfficiencyChart studyWords={validStudyWords} hideTitle={true} />
        </View>

        {/* Review Timing Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title={INFO_TITLES.retrievability}
            subtitle={STRINGS.MEMORY_RETENTION_OPTIMAL_TIMING}
          />
          {/* Current retrievability shown inline on chart */}
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
