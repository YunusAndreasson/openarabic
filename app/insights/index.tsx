import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@/components/SectionTitle';
import { ThemedView } from '@/components/ThemedView';
import { EfficiencyChart, MasteryChart, RetrievabilityChart } from '@/components/vocabulary/charts';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

import { INFO_TITLES } from './_layout';

export default function InsightsScreen(): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isDarkMode = useIsDarkMode();

  // Use the FSRS queries hook for data fetching
  const { allWords: studyWords, error } = useFSRSQueries({
    userId: user?.id,
  });

  const handleInfoPress = useCallback(
    (type: string) => {
      router.push(`/insights/info/${type}`);
    },
    [router]
  );

  const handleMasteryInfoPress = useCallback(() => handleInfoPress('mastery'), [
    handleInfoPress,
  ]);

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
        <View style={styles.errorContainer}>
          <SectionTitle title={STRINGS.INSIGHTS_UNAVAILABLE} />
        </View>
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
            paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Word Mastery Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title={INFO_TITLES.mastery}
            subtitle={STRINGS.MEMORY_STRENGTH_ACROSS_VOCABULARY}
            onInfoPress={handleMasteryInfoPress}
          />
          <MasteryChart
            studyWords={validStudyWords}
            onInfoPress={handleMasteryInfoPress}
            hideTitle={true}
          />
        </View>

        {/* Learning Progress Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title={INFO_TITLES.efficiency}
            subtitle={STRINGS.VOCABULARY_ACQUISITION_VELOCITY}
            onInfoPress={handleEfficiencyInfoPress}
          />
          <EfficiencyChart
            studyWords={validStudyWords}
            onInfoPress={handleEfficiencyInfoPress}
            hideTitle={true}
          />
        </View>

        {/* Review Timing Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title={INFO_TITLES.retrievability}
            subtitle={STRINGS.MEMORY_RETENTION_OPTIMAL_TIMING}
            onInfoPress={handleRetrievabilityInfoPress}
          />
          <RetrievabilityChart
            studyWords={validStudyWords}
            onInfoPress={handleRetrievabilityInfoPress}
            hideTitle={true}
          />
        </View>
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
  },
  chartSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
});
