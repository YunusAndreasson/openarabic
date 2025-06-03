import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';
import { CardHeader } from './shared/CardHeader';
import { InfoModal } from './InfoModal';

interface LearningGaugeProps {
  dueWords: number;
  learningWords: number;
  totalWords: number;
  masteredWords: number;
  hideTitle?: boolean;
  onInfoPress?: () => void;
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
  ({
    dueWords,
    learningWords,
    totalWords,
    masteredWords,
    hideTitle = false,
    onInfoPress,
  }: LearningGaugeProps) => {
    const colors = useColors();

    // Modal state for recommendation info
    const [modalVisible, setModalVisible] = useState(false);

    // Calculate learning state with clear, actionable insights
    const gaugeState: GaugeState = useMemo(() => {
      const reviewLoad = dueWords / Math.max(totalWords, 1);
      const completionRate = masteredWords / Math.max(totalWords, 1);

      // CRITICAL OVERLOAD: Too many due words - cognitive science explanation
      if (dueWords >= 20) {
        return {
          level: 'heavy',
          action: 'Focus on Reviews',
          insight: `Clear ${dueWords} reviews first. Working memory can only process 7±2 items effectively - high review load blocks new learning.`,
          icon: 'warning',
          color: colors.error,
        };
      }

      // HIGH LOAD: Significant review burden - spaced repetition science
      if (dueWords >= 10 || reviewLoad > 0.3) {
        return {
          level: 'heavy',
          action: 'Review First',
          insight: `Complete ${dueWords} reviews before adding words. Overdue reviews weaken memory consolidation of existing vocabulary.`,
          icon: 'alarm',
          color: colors.error,
        };
      }

      // MODERATE LOAD: Some burden - optimized learning approach
      if (dueWords >= 5 || (reviewLoad > 0.15 && totalWords > 15)) {
        return {
          level: 'moderate',
          action: 'Balanced Approach',
          insight: `Handle ${dueWords} reviews, then add 2-3 words. This maintains optimal spacing intervals while preventing cognitive overload.`,
          icon: 'scale',
          color: colors.warning,
        };
      }

      // BEGINNER: Building foundation
      if (totalWords < 15) {
        return {
          level: 'optimal',
          action: 'Build Foundation',
          insight: `Add 5-8 new words daily. Your brain can efficiently process new vocabulary without interference from review load.`,
          icon: 'school',
          color: colors.success,
        };
      }

      // ADVANCED: High mastery - sophisticated strategy
      if (completionRate > 0.7) {
        return {
          level: 'optimal',
          action: 'Expand Vocabulary',
          insight:
            dueWords === 0
              ? `Perfect timing for new words. Strong mastery rate creates optimal conditions for vocabulary expansion.`
              : `Complete ${dueWords} quick reviews, then add new words. Your high retention rate allows aggressive growth.`,
          icon: 'trending-up',
          color: colors.success,
        };
      }

      // OPTIMAL: Perfect conditions
      return {
        level: 'optimal',
        action: 'Add New Words',
        insight:
          dueWords === 0
            ? `Ideal learning window. Your memory system is clear and ready for new vocabulary acquisition.`
            : `Quick ${dueWords}-word review, then add new vocabulary. Perfect conditions for memory consolidation.`,
        icon: 'checkmark-circle',
        color: colors.success,
      };
    }, [dueWords, learningWords, totalWords, masteredWords, colors]);

    // Handle info press - show educational modal
    const handleInfoPress = () => {
      lightFeedback();
      if (onInfoPress) {
        onInfoPress();
      } else {
        setModalVisible(true);
      }
    };

    const handleCloseModal = () => {
      setModalVisible(false);
    };

    return (
      <>
        <BaseCard style={styles.gaugeCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.gaugeContent}>
            {/* Header with action as subtitle - single clear hierarchy */}
            {!hideTitle && (
              <CardHeader
                title="Recommendation"
                subtitle={gaugeState.action}
                onInfoPress={handleInfoPress}
              />
            )}

            {/* Visual indicator and insight */}
            <View style={styles.recommendationContent}>
              <View style={styles.statusIndicator}>
                <Ionicons name={gaugeState.icon} size={28} color={gaugeState.color} />
              </View>

              <ThemedText type="body" variant="secondary" style={styles.insightText}>
                {gaugeState.insight}
              </ThemedText>
            </View>
          </View>
        </BaseCard>

        {/* Educational Modal - only show if using internal modal */}
        {!onInfoPress && (
          <InfoModal visible={modalVisible} type="recommendation" onClose={handleCloseModal} />
        )}
      </>
    );
  }
);

LearningGauge.displayName = 'LearningGauge';

const styles = StyleSheet.create({
  gaugeCard: {
    overflow: 'hidden',
  },
  gaugeContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    marginLeft: -LAYOUT.SPACING.TINY,
  },
  statusIndicator: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightText: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    opacity: LAYOUT.OPACITY.HIGH,
  },
});
