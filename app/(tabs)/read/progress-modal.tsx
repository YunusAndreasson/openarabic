import type { JSX } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EfficiencyChart, MasteryChart } from '@practice/charts';
import { VocabularyMetrics } from '@practice/charts/VocabularyMetrics';
import { StreakChart } from '@read/StreakChart';
import { StreakMetrics } from '@read/StreakMetrics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SectionTitle from '@/components/common/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStreakHistory } from '@/hooks/articles/useStreakHistory';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

// Title mapping for charts
const TITLES = {
  mastery: STRINGS.WORD_MASTERY,
  efficiency: STRINGS.LEARNING_PROGRESS,
} as const;

export default function ProgressModal(): JSX.Element {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const {
    streakHistory,
    isLoading: isStreakLoading,
    isError: isStreakError,
  } = useStreakHistory({
    enabled: true,
  });

  const { allWords: studyWords, error: fsrsError } = useFSRSQueries({
    userId: user?.id,
  });

  // Charts only require FSRS fields; do not exclude entries missing root relation
  const validStudyWords = useMemo(() => studyWords ?? [], [studyWords]);

  const hasError = isStreakError || fsrsError;
  const isLoading = isStreakLoading;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: LAYOUT.SPACING.LARGE,
            paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
          },
        ]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={true}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText type="body" colorName="textTertiary">
              Loading your progress data...
            </ThemedText>
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <ThemedText type="body" colorName="textTertiary">
              Unable to load progress data. Please try again.
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Streak Section */}
            {streakHistory ? (
              <>
                <SectionTitle
                  title="Reading Streak"
                  subtitle="Your daily reading consistency over the past 30 days"
                  isFirstSection={true}
                />

                <View style={styles.streakMetricsContainer}>
                  <StreakMetrics metrics={streakHistory.metrics} />
                </View>

                <View style={styles.chartSection}>
                  <SectionTitle title="Daily Activity" subtitle="Track your reading patterns" />
                  <StreakChart
                    dailyActivity={streakHistory.dailyActivity}
                    streakPeriods={streakHistory.streakPeriods}
                  />
                </View>
              </>
            ) : null}

            {/* Vocabulary Progress Section */}
            {validStudyWords.length > 0 ? (
              <View style={styles.chartSection}>
                <SectionTitle
                  title="Vocabulary Status"
                  subtitle="Current word counts and learning progress"
                />
                <VocabularyMetrics
                  totalWords={validStudyWords.length}
                  masteredWords={
                    validStudyWords.filter(
                      word => word.fsrs_state === 2 && (word.fsrs_stability ?? 0) >= 5
                    ).length
                  }
                  learningWords={
                    validStudyWords.filter(
                      word =>
                        word.fsrs_state === 0 ||
                        word.fsrs_state === 1 ||
                        word.fsrs_state === 3 ||
                        (word.fsrs_state === 2 && (word.fsrs_stability ?? 0) < 5)
                    ).length
                  }
                />
              </View>
            ) : null}

            {/* Learning Progress Section */}
            {validStudyWords.length > 0 ? (
              <>
                <View style={styles.chartSection}>
                  <SectionTitle
                    title={TITLES.mastery}
                    subtitle={STRINGS.MEMORY_STRENGTH_ACROSS_VOCABULARY}
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
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  streakMetricsContainer: {
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  chartSection: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.XXLARGE,
  },
  errorContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    flex: 1,
    justifyContent: 'center',
    margin: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.XXLARGE,
    ...LAYOUT.ELEVATION.SMALL,
  },
});
