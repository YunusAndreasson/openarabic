import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RetrievabilityChart } from '@/components/practice/charts/RetrievabilityChart';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

export default function MemoryRetentionModal(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();

  const { allWords: studyWords } = useFSRSQueries({
    userId: user?.id,
  });

  // Calculate vocabulary statistics
  const vocabularyStats = useMemo(() => {
    if (!studyWords) return null;

    const totalWords = studyWords.length;
    const masteredWords = studyWords.filter(
      word => word.fsrs_state === 2 && (word.fsrs_stability ?? 0) >= 5
    ).length;
    const learningWords = studyWords.filter(
      word =>
        word.fsrs_state === 0 ||
        word.fsrs_state === 1 ||
        word.fsrs_state === 3 ||
        (word.fsrs_state === 2 && (word.fsrs_stability ?? 0) < 5)
    ).length;

    return { totalWords, masteredWords, learningWords };
  }, [studyWords]);

  return (
    <ThemedView style={styles.container}>
      {/* Chart Content */}
      <View style={styles.chartContainer}>
        <RetrievabilityChart
          studyWords={studyWords ?? []}
          hideTitle={true}
          showWarningLine={true}
        />
      </View>

      {/* Educational Explanation */}
      <View style={styles.explanationContainer}>
        <ThemedText style={styles.explanationText} variant="secondary">
          Memory capacity shows your retention percentage. At 100%, you can recall all vocabulary
          words.
        </ThemedText>

        <View style={[styles.tipContainer, { backgroundColor: colors.elevation1 }]}>
          <Ionicons name="bulb" size={16} color={colors.warning} style={styles.tipIcon} />
          <ThemedText style={styles.tipText} variant="secondary">
            Stay above the 70% threshold line. Practice existing words before adding new ones.
          </ThemedText>
        </View>
      </View>

      {/* Vocabulary Statistics */}
      {vocabularyStats && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.elevation1 }]}>
            <ThemedText style={styles.statValue} weight="semibold">
              {vocabularyStats.totalWords}
            </ThemedText>
            <ThemedText style={styles.statLabel} variant="secondary">
              Total Words
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.elevation1 }]}>
            <ThemedText style={styles.statValue} weight="semibold">
              {vocabularyStats.masteredWords}
            </ThemedText>
            <ThemedText style={styles.statLabel} variant="secondary">
              Mastered
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.elevation1 }]}>
            <ThemedText style={styles.statValue} weight="semibold">
              {vocabularyStats.learningWords}
            </ThemedText>
            <ThemedText style={styles.statLabel} variant="secondary">
              Learning
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  explanationContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  explanationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    textAlign: 'left',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  tipIcon: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
  },
  tipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    textAlign: 'left',
    flex: 1,
  },
  chartContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textAlign: 'center',
  },
});
