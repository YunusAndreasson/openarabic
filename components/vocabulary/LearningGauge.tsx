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

    // Modal state for recommendation info
    const [modalVisible, setModalVisible] = useState(false);

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

    // Handle info press - show educational modal
    const handleInfoPress = () => {
      lightFeedback();
      setModalVisible(true);
    };

    const handleCloseModal = () => {
      setModalVisible(false);
    };

    return (
      <>
        <BaseCard style={styles.gaugeCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.gaugeContent}>
            {/* Header with action as subtitle - single clear hierarchy */}
            <CardHeader
              title="Recommendation"
              subtitle={gaugeState.action}
              onInfoPress={handleInfoPress}
            />

            {/* Visual indicator and insight */}
            <View style={styles.recommendationContent}>
              <View style={[styles.statusIndicator, { backgroundColor: `${gaugeState.color}15` }]}>
                <Ionicons name={gaugeState.icon} size={28} color={gaugeState.color} />
              </View>

              <ThemedText type="body" variant="secondary" style={styles.insightText}>
                {gaugeState.insight}
              </ThemedText>
            </View>
          </View>
        </BaseCard>

        {/* Educational Modal */}
        <InfoModal visible={modalVisible} type="recommendation" onClose={handleCloseModal} />
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
    gap: LAYOUT.SPACING.MEDIUM,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
