/**
 * PracticeStatCards Component
 *
 * The practice home's stats surface: a vocabulary-growth hero chart,
 * a slim "today" status strip, and a row of progress tiles. The abstract
 * memory-strength gauge lives in the memory-retention sheet; the single
 * start-review CTA is pinned near the bottom of the screen.
 */
import { MetricCard } from '@/components/common/MetricCard';
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
  reviewedToday?: number;
  nextDueDate?: Date | null;
  dueCountCapped?: boolean;
  currentStreak?: number;
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
  reviewedToday = 0,
  nextDueDate = null,
  dueCountCapped = false,
  currentStreak = 0,
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

  const stats = [
    {
      label: STRINGS.STREAK_LABEL,
      value: currentStreak,
      color: colors.warning,
      icon: 'flame' as const,
      onPress: onStreakPress,
    },
    {
      label: VocabularyStatCategory.MASTERED,
      value: masteredWords,
      color: colors.success,
      icon: 'trophy' as const,
      onPress: onMasteredPress,
    },
    {
      label: STRINGS.MEMORY_LABEL,
      value: `${Math.round(memoryRetention)}%`,
      color: memoryColor,
      icon: 'pulse' as const,
      onPress: onMemoryPress,
    },
    // Only surfaced when the learner actually has leeches, so it never nags.
    ...(leechCount > 0
      ? [
          {
            label: STRINGS.REVISIT_LABEL,
            value: leechCount,
            color: colors.error,
            icon: 'alert-circle' as const,
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
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            color={stat.color}
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
