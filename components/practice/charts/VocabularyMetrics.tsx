import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface VocabularyMetricsProps {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
}

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}

const MetricCard = memo<MetricCardProps>(({ icon, value, label, color }) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.metricCard,
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
      <ThemedText type="heading2" weight="bold" style={[styles.metricValue, { color }]}>
        {value}
      </ThemedText>
      <ThemedText type="caption" colorName="textTertiary" style={styles.metricLabel}>
        {label}
      </ThemedText>
    </View>
  );
});

MetricCard.displayName = 'MetricCard';

export const VocabularyMetrics = memo<VocabularyMetricsProps>(
  ({ totalWords, masteredWords, learningWords }) => {
    const colors = useColors();

    return (
      <View style={styles.container}>
        <View style={styles.metricsRow}>
          <MetricCard
            icon="library"
            value={totalWords.toString()}
            label={STRINGS.VOCAB_STAT_TOTAL}
            color={colors.tint}
          />

          <MetricCard
            icon="checkmark-circle"
            value={masteredWords.toString()}
            label={STRINGS.VOCAB_STAT_MASTERED}
            color={colors.success}
          />

          <MetricCard
            icon="school"
            value={learningWords.toString()}
            label={STRINGS.VOCAB_STAT_LEARNING}
            color={colors.warning}
          />
        </View>
      </View>
    );
  }
);

VocabularyMetrics.displayName = 'VocabularyMetrics';

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
  metricCard: {
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
  metricValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  metricLabel: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
