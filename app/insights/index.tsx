import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@/components/SectionTitle';
import { ThemedView } from '@/components/ThemedView';
import { EfficiencyChart, MasteryChart, RetrievabilityChart } from '@/components/vocabulary/charts';
import { LAYOUT } from '@/constants/layout';
import { getInsightsInfoRoute } from '@/constants/routes';
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

  const handleInfoPress = useCallback((type: string) => {
    router.push(getInsightsInfoRoute(type));
  }, []);

  const handleMasteryInfoPress = useCallback(() => handleInfoPress('mastery'), [handleInfoPress]);

  const handleEfficiencyInfoPress = useCallback(
    () => handleInfoPress('efficiency'),
    [handleInfoPress]
  );

  const handleRetrievabilityInfoPress = useCallback(
    () => handleInfoPress('retrievability'),
    [handleInfoPress]
  );

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
          entering={FadeIn.duration(400)}
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
        {/* Word Mastery Chart */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={[styles.chartCard, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle
            title={INFO_TITLES.mastery}
            subtitle={STRINGS.MEMORY_STRENGTH_ACROSS_VOCABULARY}
            onInfoPress={handleMasteryInfoPress}
            isFirstSection={true}
          />
          <View style={styles.chartWrapper}>
            <MasteryChart
              studyWords={validStudyWords}
              onInfoPress={handleMasteryInfoPress}
              hideTitle={true}
            />
          </View>
        </Animated.View>

        {/* Learning Progress Chart */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(600).springify()}
          style={[styles.chartCard, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle
            title={INFO_TITLES.efficiency}
            subtitle={STRINGS.VOCABULARY_ACQUISITION_VELOCITY}
            onInfoPress={handleEfficiencyInfoPress}
          />
          <View style={styles.chartWrapper}>
            <EfficiencyChart
              studyWords={validStudyWords}
              onInfoPress={handleEfficiencyInfoPress}
              hideTitle={true}
            />
          </View>
        </Animated.View>

        {/* Review Timing Chart */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(600).springify()}
          style={[styles.chartCard, { backgroundColor: colors.elevation1 }]}
        >
          <SectionTitle
            title={INFO_TITLES.retrievability}
            subtitle={STRINGS.MEMORY_RETENTION_OPTIMAL_TIMING}
            onInfoPress={handleRetrievabilityInfoPress}
          />
          <View style={styles.chartWrapper}>
            <RetrievabilityChart
              studyWords={validStudyWords}
              onInfoPress={handleRetrievabilityInfoPress}
              hideTitle={true}
            />
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
});
