import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

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
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

export const LearningGauge = memo(
  ({ dueWords, learningWords, totalWords, masteredWords }: LearningGaugeProps) => {
    const colors = useColors();

    // Calculate learning state with clear, intuitive thresholds
    const gaugeState: GaugeState = useMemo(() => {
      const reviewLoad = dueWords / Math.max(totalWords, 1);
      const masteryRatio = masteredWords / Math.max(totalWords, 1);

      // HEAVY: High review burden - focus needed
      if (dueWords > 15 || reviewLoad > 0.25) {
        return {
          level: 'heavy',
          title: 'Focus on Reviews',
          subtitle: `${dueWords} words need attention`,
          icon: 'refresh-circle',
          color: colors.error,
          bgColor: withOpacity(colors.error, 0.12),
        };
      }

      // MODERATE: Some review burden - balanced approach
      if (dueWords > 5 || (reviewLoad > 0.1 && totalWords > 20)) {
        return {
          level: 'moderate',
          title: 'Review & Learn',
          subtitle: `${dueWords} words due for review`,
          icon: 'library',
          color: colors.warning,
          bgColor: withOpacity(colors.warning, 0.12),
        };
      }

      // OPTIMAL: Low review burden - perfect for learning
      return {
        level: 'optimal',
        title: 'Ready to Learn',
        subtitle: totalWords < 10 ? 'Start adding words' : 'Perfect time to expand',
        icon: 'add-circle',
        color: colors.success,
        bgColor: withOpacity(colors.success, 0.12),
      };
    }, [dueWords, learningWords, totalWords, masteredWords, colors]);

    return (
      <BaseCard style={styles.gaugeCard} shadowSize="small" includePressAnimation={false}>
        <View style={[styles.gaugeContent, { backgroundColor: gaugeState.bgColor }]}>
          {/* Status Indicator - Clean and minimal */}
          <View style={styles.statusIndicator}>
            {/* Simple Icon Container - No complex rings */}
            <View style={[styles.iconContainer, { backgroundColor: gaugeState.color }]}>
              <Ionicons name={gaugeState.icon} size={28} color={colors.background} />
            </View>
          </View>

          {/* Content - Better hierarchy */}
          <View style={styles.contentArea}>
            {/* Primary Message */}
            <View style={styles.messageContainer}>
              <ThemedText type="heading2" weight="bold" style={styles.primaryTitle}>
                {gaugeState.title}
              </ThemedText>
              <ThemedText type="body" variant="secondary" style={styles.secondaryMessage}>
                {gaugeState.subtitle}
              </ThemedText>
            </View>

            {/* Status Badge - Visual reinforcement */}
            <View
              style={[styles.statusBadge, { backgroundColor: withOpacity(gaugeState.color, 0.15) }]}
            >
              <View style={[styles.statusDot, { backgroundColor: gaugeState.color }]} />
              <ThemedText
                type="caption"
                weight="medium"
                style={[styles.statusText, { color: gaugeState.color }]}
              >
                {gaugeState.level === 'optimal'
                  ? 'Optimal'
                  : gaugeState.level === 'moderate'
                    ? 'Moderate'
                    : 'Heavy Load'}
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

LearningGauge.displayName = 'LearningGauge';

const styles = StyleSheet.create({
  gaugeCard: {
    marginBottom: LAYOUT.SPACING.LARGE,
    overflow: 'hidden',
  },
  gaugeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
    minHeight: 88, // Reduced height for better proportion
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.LARGE,
  },
  iconContainer: {
    width: 56, // Larger for better presence
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Subtle depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  primaryTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  secondaryMessage: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    opacity: 0.8, // Subtle hierarchy
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: LAYOUT.SPACING.TINY,
  },
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
