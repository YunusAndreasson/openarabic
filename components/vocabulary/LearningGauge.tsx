import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

interface LearningGaugeProps {
  dueWords: number;
  learningWords: number;
  totalWords: number;
  masteredWords: number;
}

type GaugeLevel = 'optimal' | 'moderate' | 'heavy';

interface GaugeState {
  level: GaugeLevel;
  action: string;
  insight: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const LearningGauge = memo(
  ({ dueWords, learningWords, totalWords, masteredWords }: LearningGaugeProps) => {
    const colors = useColors();

    // Calculate learning state with clear, actionable insights
    const gaugeState: GaugeState = useMemo(() => {
      const reviewLoad = dueWords / Math.max(totalWords, 1);

      // HEAVY: High review burden - focus needed
      if (dueWords > 15 || reviewLoad > 0.25) {
        return {
          level: 'heavy',
          action: 'Review First',
          insight: `${dueWords} cards overdue - strengthen retention before expanding`,
          icon: 'refresh-circle',
          color: colors.error,
        };
      }

      // MODERATE: Some review burden - balanced approach
      if (dueWords > 5 || (reviewLoad > 0.1 && totalWords > 20)) {
        return {
          level: 'moderate',
          action: 'Balance & Grow',
          insight: `${dueWords} cards due - maintain intervals while adding new words`,
          icon: 'library',
          color: colors.warning,
        };
      }

      // OPTIMAL: Low review burden - perfect for learning
      return {
        level: 'optimal',
        action: 'Add New Words',
        insight:
          totalWords < 10 ? 'Build your foundation deck' : 'Perfect time to expand vocabulary',
        icon: 'add-circle',
        color: colors.success,
      };
    }, [dueWords, learningWords, totalWords, masteredWords, colors]);

    return (
      <BaseCard style={styles.gaugeCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.gaugeContent}>
          {/* Visual Status Indicator */}
          <View style={[styles.statusIndicator, { backgroundColor: `${gaugeState.color}15` }]}>
            <Ionicons name={gaugeState.icon} size={28} color={gaugeState.color} />
          </View>

          {/* Unified Message */}
          <View style={styles.messageArea}>
            <ThemedText type="caption" weight="medium" style={styles.recommendationLabel}>
              Recommendation
            </ThemedText>
            <ThemedText type="heading2" weight="bold" style={styles.actionText}>
              {gaugeState.action}
            </ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.insightText}>
              {gaugeState.insight}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    );
  }
);

LearningGauge.displayName = 'LearningGauge';

const styles = StyleSheet.create({
  gaugeCard: {
    overflow: 'hidden',
  },
  gaugeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  statusIndicator: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageArea: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
  actionText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  insightText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    opacity: LAYOUT.OPACITY.HIGH,
  },
  recommendationLabel: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
});
