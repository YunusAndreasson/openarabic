/**
 * PracticeStatCards Component
 *
 * The practice home's stats surface: a vocabulary-growth hero chart,
 * a slim "today" status strip, and a row of progress tiles. The abstract
 * memory-strength gauge lives in the memory-retention sheet; the single
 * start-review CTA is pinned near the bottom of the screen.
 */
import { MetricCard } from '@/components/common';
import { StyleSheet, View } from 'react-native';

import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import { TodayCard } from './TodayCard';
import { VocabularyProgressChart } from './charts/VocabularyProgressChart';
import { VocabularyStatCategory } from '@/types/enums';

interface PracticeStatCardsProps {
  masteredWords?: number;
  dueWords?: number;
  memoryRetention?: number;
  /** False when no word has been reviewed yet, so there is no score to show. */
  hasMeasuredMemory?: boolean;
  reviewedToday?: number;
  nextDueDate?: Date | null;
  dueCountCapped?: boolean;
  currentStreak?: number;
  /** False until the streak has actually been read, so a pending or failed
   *  fetch never renders as "0". */
  hasStreak?: boolean;
  leechCount?: number;
  studyWords?: StudyWord[];
  onDuePress?: () => void;
  onStreakPress?: () => void;
  onMasteredPress?: () => void;
  onMemoryPress?: () => void;
  onVocabularyPress?: () => void;
  onRevisitPress?: () => void;
}

export function PracticeStatCards({
  masteredWords = 0,
  dueWords = 0,
  memoryRetention = 0,
  hasMeasuredMemory = true,
  reviewedToday = 0,
  nextDueDate = null,
  dueCountCapped = false,
  currentStreak = 0,
  hasStreak = true,
  leechCount = 0,
  studyWords = [],
  onDuePress,
  onStreakPress,
  onMasteredPress,
  onMemoryPress,
  onVocabularyPress,
  onRevisitPress,
}: PracticeStatCardsProps) {
  const colors = useColors();

  // Status color legitimately means good/bad on the memory tile
  const memoryColor =
    memoryRetention < MEMORY_CAPACITY_THRESHOLDS.POOR
      ? colors.error
      : memoryRetention < MEMORY_CAPACITY_THRESHOLDS.GOOD
        ? colors.warning
        : colors.success;

  // Colour is spent only where it carries information. Memory health is
  // genuinely good/bad, and a leech count only ever appears because something
  // needs attention; a streak and a mastered count are just numbers, and
  // painting those too turned the row into three unrelated accent colours.
  const stats = [
    {
      label: STRINGS.STREAK_LABEL,
      // An unread streak is not a streak of zero. Rendering the pending (or
      // failed) state as "0" tells someone on a 43-day run that they have lost
      // it — measured on device: every cold start flashed "0" before the query
      // landed, and a failed fetch left it there. Same reasoning as the memory
      // tile below, which has always shown "—" rather than a false score.
      value: hasStreak ? currentStreak : STRINGS.EMPTY_METRIC,
      onPress: onStreakPress,
    },
    {
      label: VocabularyStatCategory.MASTERED,
      value: masteredWords,
      onPress: onMasteredPress,
    },
    {
      label: STRINGS.MEMORY_LABEL,
      // Nothing practised yet means nothing to measure. Rendering that as "0%"
      // (in error red) reads as "you have forgotten everything" to someone who
      // has simply not started.
      value: hasMeasuredMemory ? `${Math.round(memoryRetention)}%` : STRINGS.EMPTY_METRIC,
      valueColor: hasMeasuredMemory ? memoryColor : undefined,
      onPress: onMemoryPress,
    },
    // Only surfaced when the learner actually has leeches, so it never nags.
    ...(leechCount > 0
      ? [
          {
            label: STRINGS.REVISIT_LABEL,
            value: leechCount,
            valueColor: colors.error,
            onPress: onRevisitPress,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      {/* Progress group: the growth story and its supporting numbers */}
      <VocabularyProgressChart studyWords={studyWords} onPress={onVocabularyPress} />

      <View style={styles.statsRow}>
        {stats.map(stat => (
          <MetricCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            valueColor={stat.valueColor}
            onPress={stat.onPress}
          />
        ))}
      </View>

      {/* Today strip last — nearest the pinned CTA it relates to */}
      <TodayCard
        dueCount={dueWords}
        reviewedToday={reviewedToday}
        nextDueDate={nextDueDate}
        dueCountCapped={dueCountCapped}
        onPress={onDuePress}
      />
    </View>
  );
}

PracticeStatCards.displayName = 'PracticeStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.SMALL,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
});
