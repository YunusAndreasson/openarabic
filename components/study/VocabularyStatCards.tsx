/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { MetricCard } from '@/components/common/MetricCard';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

import { MemoryRetentionGauge } from './charts/MemoryRetentionGauge';
import { VocabularyStatCategory } from '@/types/enums';
import type { StudyWord } from '@/types/vocabulary.types';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  dueWords?: number;
  currentStreak?: number;
  onInfoPress?: () => void;
  onDuePress?: () => void;
  onStreakPress?: () => void;
  onMasteredPress?: () => void;
  studyWords?: StudyWord[];
}

export function VocabularyStatCards({
  masteredWords = 0,
  dueWords = 0,
  currentStreak = 0,
  onInfoPress,
  onDuePress,
  onStreakPress,
  onMasteredPress,
  studyWords = [],
}: VocabularyStatCardsProps) {
  const colors = useColors();

  const stats = [
    {
      label: VocabularyStatCategory.DUE,
      value: dueWords,
      color: colors.error,
      icon: 'hourglass' as const,
      onPress: onDuePress,
      formatAsDecimal: false,
    },
    {
      label: STRINGS.STREAK_LABEL,
      value: currentStreak,
      color: colors.warning,
      icon: 'flame' as const,
      onPress: onStreakPress,
      formatAsDecimal: false,
    },
    {
      label: VocabularyStatCategory.MASTERED,
      value: masteredWords,
      color: colors.success,
      icon: 'trophy' as const,
      onPress: onMasteredPress,
      formatAsDecimal: false,
    },
  ];

  return (
    <View style={styles.container}>
      <MemoryRetentionGauge studyWords={studyWords} onInfoPress={onInfoPress} />

      {/* Stats row below gauge */}
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
    </View>
  );
}

VocabularyStatCards.displayName = 'VocabularyStatCards';

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
