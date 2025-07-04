import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@/components/SectionTitle';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EfficiencyChart, MasteryChart, RetrievabilityChart } from '@/components/vocabulary/charts';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { INFO_TITLES } from './_layout';

export default function InsightsScreen(): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isDarkMode = useIsDarkMode();
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

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
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
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + LAYOUT.SPACING.XXLARGE,
          },
        ]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={true}
      >
        {/* Introductory context */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(LAYOUT.ANIMATION.DURATION.SLOW).springify()}
          style={styles.introSection}
        >
          <ThemedText style={styles.introText} type="caption" variant="secondary">
            {STRINGS.INSIGHTS_EXPLANATION}
          </ThemedText>
        </Animated.View>

        {/* Word Mastery Chart */}
        <Animated.View
          entering={FadeInDown.delay(LAYOUT.ANIMATION.DURATION.FAST / 2)
            .duration(LAYOUT.ANIMATION.DURATION.SLOW * 2)
            .springify()}
          style={[styles.chartCard, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle
            title={INFO_TITLES.mastery}
            subtitle={STRINGS.MEMORY_STRENGTH_ACROSS_VOCABULARY}
            isFirstSection={true}
          />
          <View style={styles.chartWrapper}>
            <MasteryChart studyWords={validStudyWords} hideTitle={true} />
          </View>
        </Animated.View>

        {/* Learning Progress Chart */}
        <Animated.View
          entering={FadeInDown.delay(LAYOUT.ANIMATION.DURATION.FAST)
            .duration(LAYOUT.ANIMATION.DURATION.SLOW * 2)
            .springify()}
          style={[styles.chartCard, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle
            title={INFO_TITLES.efficiency}
            subtitle={STRINGS.VOCABULARY_ACQUISITION_VELOCITY}
          />
          <View style={styles.chartWrapper}>
            <EfficiencyChart studyWords={validStudyWords} hideTitle={true} />
          </View>
        </Animated.View>

        {/* Review Timing Chart */}
        <Animated.View
          entering={FadeInDown.delay(LAYOUT.ANIMATION.DURATION.SLOW)
            .duration(LAYOUT.ANIMATION.DURATION.SLOW * 2)
            .springify()}
          style={[styles.chartCard, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle
            title={INFO_TITLES.retrievability}
            subtitle={STRINGS.MEMORY_RETENTION_OPTIMAL_TIMING}
          />
          <View style={styles.chartWrapper}>
            <RetrievabilityChart studyWords={validStudyWords} hideTitle={true} />
          </View>
        </Animated.View>
      </ScrollView>
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
  chartCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM, // Reduced bottom padding for better balance
    paddingHorizontal: LAYOUT.SPACING.MEDIUM, // Reduced horizontal padding for charts
    ...LAYOUT.ELEVATION.SMALL,
  },
  chartWrapper: {
    marginTop: LAYOUT.SPACING.TINY,
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
  introSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  introText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.5, // Better readability
  },
});
