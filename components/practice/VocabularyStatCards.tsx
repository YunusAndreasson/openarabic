/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

import { MemoryRetentionGauge } from './charts/MemoryRetentionGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onInfoPress?: () => void;
  onDuePress?: () => void;
  onLearningPress?: () => void;
  onMasteredPress?: () => void;
  studyWords?: StudyWord[];
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: 'alert-circle' | 'school' | 'checkmark-circle';
  onPress?: () => void;
}

const StatCard = memo<StatCardProps>(({ label, value, color, icon, onPress }) => {
  if (!onPress) {
    return (
      <BaseCard shadowSize="small" style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <ThemedText type="heading2" weight="bold" style={[styles.statValue, { color }]}>
          {value}
        </ThemedText>
        <ThemedText type="caption" colorName="textTertiary" style={styles.statLabel}>
          {label}
        </ThemedText>
      </BaseCard>
    );
  }

  return (
    <BaseCard
      shadowSize="small"
      style={styles.statCard}
      onPress={onPress}
      includePressAnimation={true}
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
    </BaseCard>
  );
});

StatCard.displayName = 'StatCard';

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onInfoPress,
    onDuePress,
    onLearningPress,
    onMasteredPress,
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
        label: STRINGS.VOCAB_STAT_DUE,
        value: validatedInput.dueWords,
        color: colors.error,
        icon: 'alert-circle' as const,
        onPress: onDuePress, // Due words now open prognosis chart
      },
      {
        label: STRINGS.VOCAB_STAT_LEARNING,
        value: validatedInput.learningWords,
        color: colors.warning,
        icon: 'school' as const,
        onPress: onLearningPress,
      },
      {
        label: STRINGS.VOCAB_STAT_MASTERED,
        value: validatedInput.masteredWords,
        color: colors.success,
        icon: 'checkmark-circle' as const,
        onPress: onMasteredPress,
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
              onPress={stat.onPress}
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
    width: 32, // Fixed size instead of MIN_TOUCH_TARGET.SMALL
    height: 32, // Fixed size instead of MIN_TOUCH_TARGET.SMALL
    borderRadius: 16, // Fixed size instead of MIN_TOUCH_TARGET.SMALL / 2
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
