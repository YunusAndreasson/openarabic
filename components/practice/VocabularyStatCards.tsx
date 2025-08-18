/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import { MemoryRetentionGauge } from './charts/MemoryRetentionGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onInfoPress?: () => void;
  studyWords?: StudyWord[];
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const StatCard = memo<StatCardProps>(({ label, value, color, icon }) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderOverlay,
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <ThemedText type="heading2" weight="bold" style={[styles.statValue, { color }]}>
        {value}
      </ThemedText>
      <ThemedText type="caption" colorName="textTertiary" style={styles.statLabel}>
        {label}
      </ThemedText>
    </View>
  );
});

StatCard.displayName = 'StatCard';

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onInfoPress,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();

    const validatedInput = {
      masteredWords: Math.max(0, masteredWords),
      learningWords: Math.max(0, learningWords),
      dueWords: Math.max(0, dueWords),
      studyWords: Array.isArray(studyWords) ? studyWords : [],
    };

    // Memoize stats array to prevent recreation
    const stats = [
      {
        label: 'Due',
        value: validatedInput.dueWords,
        color: colors.error,
        icon: 'alert-circle' as const,
      },
      {
        label: 'Learning',
        value: validatedInput.learningWords,
        color: colors.warning,
        icon: 'school' as const,
      },
      {
        label: 'Mastered',
        value: validatedInput.masteredWords,
        color: colors.success,
        icon: 'checkmark-circle' as const,
      },
    ];

    return (
      <View style={styles.container}>
        <MemoryRetentionGauge studyWords={validatedInput.studyWords} onInfoPress={onInfoPress} />

        {/* Stats row below gauge */}
        <View style={styles.statsRow}>
          {stats.map(stat => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              icon={stat.icon}
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
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    ...LAYOUT.ELEVATION.SMALL,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
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
