/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import BaseCard from '@common/BaseCard';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';


import { ThemedText } from '@/components/ThemedText';
import { MemoryRetentionGauge } from '@/components/study/charts/MemoryRetentionGauge';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { VocabularyStatCategory } from '@/types/enums';
import type { StudyWord } from '@/types/vocabulary.types';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learnedWords?: number;
  dueWords?: number;
  onInfoPress?: () => void;
  onDuePress?: () => void;
  onLearnedPress?: () => void;
  onMasteredPress?: () => void;
  studyWords?: StudyWord[];
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: 'time' | 'school' | 'trophy';
  onPress?: () => void;
  formatAsDecimal?: boolean;
}

const StatCard = memo<StatCardProps>(({ label, value, color, icon, onPress, formatAsDecimal = false }) => {
  const displayValue = formatAsDecimal ? value.toFixed(1) : Math.round(value).toString();

  return (
    <BaseCard shadowSize="small" style={styles.statCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={color} />
      </View>
      <ThemedText type="heading2" weight="bold" style={[styles.statValue, { color }]}>
        {displayValue}
      </ThemedText>
      <ThemedText type="caption" colorName="textTertiary" style={styles.statLabel}>
        {label}
      </ThemedText>
    </BaseCard>
  );
});

StatCard.displayName = 'StatCard';

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learnedWords = 0,
    dueWords = 0,
    onInfoPress,
    onDuePress,
    onLearnedPress,
    onMasteredPress,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();

    // Memoize stats array with proper dependencies to prevent unnecessary recreation
    const stats = useMemo(
      () => [
        {
          label: VocabularyStatCategory.DUE,
          value: dueWords,
          color: colors.error,
          icon: 'time' as const,
          onPress: onDuePress, // Due words now open prognosis chart
          formatAsDecimal: false,
        },
        {
          label: VocabularyStatCategory.LEARNED,
          value: learnedWords,
          color: colors.warning,
          icon: 'school' as const,
          onPress: onLearnedPress,
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
      ],
      [
        dueWords,
        learnedWords,
        masteredWords,
        colors.error,
        colors.warning,
        colors.success,
        onDuePress,
        onLearnedPress,
        onMasteredPress,
      ]
    );

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
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.LARGE,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
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

export default VocabularyStatCards;
