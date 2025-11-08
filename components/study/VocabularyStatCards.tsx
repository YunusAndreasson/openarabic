/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { BaseCard } from '@/components/common';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ICON_CONTAINER, LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
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

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: 'time' | 'flame' | 'trophy';
  onPress?: () => void;
  formatAsDecimal?: boolean;
}

function StatCard({ label, value, color, icon, onPress, formatAsDecimal = false }: StatCardProps) {
  const displayValue = formatAsDecimal ? value.toFixed(1) : Math.round(value).toString();

  return (
    <BaseCard shadowSize="small" style={styles.statCard} onPress={onPress}>
      <View style={styles.cardWrapper}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}14` }]}>
          <Ionicons name={icon} size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={color} />
        </View>
        <ThemedText type="heading2" weight="bold" style={[styles.statValue, { color }]}>
          {displayValue}
        </ThemedText>
        <ThemedText type="caption" colorName="textTertiary" style={styles.statLabel}>
          {label}
        </ThemedText>
      </View>
    </BaseCard>
  );
}

StatCard.displayName = 'StatCard';

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
      icon: 'time' as const,
      onPress: onDuePress,
      formatAsDecimal: false,
    },
    {
      label: 'Streak',
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
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            color={stat.color}
            icon={stat.icon}
            onPress={stat.onPress}
            formatAsDecimal={stat.formatAsDecimal}
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
  statCard: {
    flex: 1,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  cardWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: ICON_CONTAINER.SMALL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    // Ensure perfect horizontal centering
    alignSelf: 'center',
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  statLabel: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
