import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@/components/SectionTitle';
import { ThemedView } from '@/components/ThemedView';
import { EfficiencyChart, MasteryChart, RetrievabilityChart } from '@/components/vocabulary/charts';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { selectionFeedback } from '@/utils/haptics';

export default function InsightsScreen(): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isDarkMode = useIsDarkMode();

  // Use the FSRS queries hook for data fetching
  const { allWords: studyWords, error } = useFSRSQueries({
    userId: user?.id,
  });

  const handleInfoPress = useCallback((type: string) => {
    selectionFeedback();
    router.push(`/insights/info/${type}`);
  }, []);

  // Filter valid study words
  const validStudyWords = studyWords?.filter(word => word != null && word.root_id != null) ?? [];

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <SectionTitle title="Insights unavailable" />
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
            title="Word Mastery"
            subtitle="Memory strength across your vocabulary"
            onInfoPress={() => handleInfoPress('mastery')}
          />
          <MasteryChart
            studyWords={validStudyWords}
            onInfoPress={() => handleInfoPress('mastery')}
            hideTitle={true}
          />
        </View>

        {/* Learning Progress Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title="Learning Progress"
            subtitle="Vocabulary acquisition velocity"
            onInfoPress={() => handleInfoPress('efficiency')}
          />
          <EfficiencyChart
            studyWords={validStudyWords}
            onInfoPress={() => handleInfoPress('efficiency')}
            hideTitle={true}
          />
        </View>

        {/* Review Timing Chart */}
        <View style={styles.chartSection}>
          <SectionTitle
            title="Review Timing"
            subtitle="Memory retention and optimal practice timing"
            onInfoPress={() => handleInfoPress('retrievability')}
          />
          <RetrievabilityChart
            studyWords={validStudyWords}
            onInfoPress={() => handleInfoPress('retrievability')}
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
    marginBottom: LAYOUT.SPACING.TINY,
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
});
