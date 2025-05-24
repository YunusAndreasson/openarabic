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

      // HEAVY: High review burden - focus needed
      if (dueWords > 15 || reviewLoad > 0.25) {
        return {
          level: 'heavy',
          title: 'Focus on Reviews',
          subtitle: `${dueWords} words need attention`,
          icon: 'refresh-circle',
          color: colors.error,
          bgColor: colors.socialIconBg,
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
          bgColor: colors.socialIconBg,
        };
      }

      // OPTIMAL: Low review burden - perfect for learning
      return {
        level: 'optimal',
        title: 'Ready to Learn',
        subtitle: totalWords < 10 ? 'Start adding words' : 'Perfect time to expand',
        icon: 'add-circle',
        color: colors.success,
        bgColor: colors.socialIconBg,
      };
    }, [dueWords, learningWords, totalWords, masteredWords, colors]);

    return (
      <BaseCard style={styles.gaugeCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.gaugeContent}>
          {/* Status Indicator - Clean and minimal */}
          <View style={styles.statusIndicator}>
            {/* Simple Icon Container - No complex rings */}
            <View style={styles.iconContainer}>
              <Ionicons name={gaugeState.icon} size={36} color={gaugeState.color} />
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

            {/* Status text - Clean without container */}
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
    paddingHorizontal: 3,
    paddingVertical: LAYOUT.CARD.PADDING.MEDIUM,
    minHeight: 96, // Increased height for better proportion and alignment
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64, // Larger for better presence and alignment
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
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
    opacity: LAYOUT.OPACITY.HIGH, // Subtle hierarchy using standardized opacity
  },
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
