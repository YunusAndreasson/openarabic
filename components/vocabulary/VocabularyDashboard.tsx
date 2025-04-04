import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../../constants/layout';
import { VocabularyStats } from '@/types/vocabulary.types';
import { usePressAnimation } from '@/hooks/animations';
import Animated, { AnimatedStyleProp } from 'react-native-reanimated';
import BaseCard from '../BaseCard';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

// Using subset of properties from the VocabularyStats type for this component
interface VocabularyDashboardProps
  extends Pick<VocabularyStats, 'totalWords' | 'dueWords' | 'masteredWords' | 'learningWords'> {
  /** Flag to trigger animations when parent component is ready */
  animationTriggered?: boolean;
  /** Callback for when a stat item is pressed */
  onStatPress?: (category: 'total' | 'mastered' | 'learning' | 'due') => void;
  /** Streak and difficulty statistics */
  streakStats?: {
    longestSuccessStreak: number;
    wordsWithStreaks: number;
    averageDifficulty: number;
  };
}

interface StatItemProps {
  value: number;
  label: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  animateValue: boolean;
  category: 'total' | 'mastered' | 'learning' | 'due';
  onPress?: (category: 'total' | 'mastered' | 'learning' | 'due') => void;
}

// Separate StatItem component for better reusability and memoization
const StatItem = React.memo(
  ({ value, label, icon, iconColor, bgColor, category, onPress }: StatItemProps) => {
    // Use the standard press animation hook
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
    });

    const handlePress = () => {
      // Call the onPress callback if provided
      if (onPress) {
        onPress(category);
      }
    };

    return (
      <Animated.View style={animatedStyle as AnimatedStyleProp<ViewStyle>}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
          disabled={!onPress}
          accessibilityLabel={`${label}: ${value} words`}
          accessibilityRole="button"
          accessibilityHint={`Shows details about ${label.toLowerCase()} words`}
        >
          <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={iconColor} />
          </View>
          <ThemedText type="body" weight="600" style={styles.statValue}>
            {value}
          </ThemedText>
          <ThemedText type="caption" variant="secondary" weight="500">
            {label}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

StatItem.displayName = 'StatItem';

export const VocabularyDashboard = React.memo(
  ({
    totalWords = 0,
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    animationTriggered = false,
    onStatPress,
  }: VocabularyDashboardProps) => {
    const colors = useColors();

    // Prepare stat items data
    const statItems = useMemo(
      () => [
        {
          value: totalWords,
          label: 'Total',
          icon: 'book',
          iconColor: colors.text,
          bgColor: withOpacity(colors.text, 0.19),
          animateValue: animationTriggered,
          category: 'total' as const,
        },
        {
          value: masteredWords,
          label: 'Mastered',
          icon: 'checkmark-circle',
          iconColor: colors.success,
          bgColor: withOpacity(colors.success, 0.19),
          animateValue: animationTriggered,
          category: 'mastered' as const,
        },
        {
          value: learningWords,
          label: 'Learning',
          icon: 'school',
          iconColor: colors.info,
          bgColor: withOpacity(colors.info, 0.19),
          animateValue: animationTriggered,
          category: 'learning' as const,
        },
        {
          value: dueWords,
          label: 'Review',
          icon: 'alarm',
          iconColor: colors.warning,
          bgColor: withOpacity(colors.warning, 0.19),
          animateValue: animationTriggered,
          category: 'due' as const,
        },
      ],
      [totalWords, masteredWords, learningWords, dueWords, colors, animationTriggered]
    );

    return (
      <BaseCard style={styles.mainCard} includePressAnimation={false} shadowSize="medium">
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {statItems.map((item, index) => (
            <StatItem
              key={index}
              value={item.value}
              label={item.label}
              icon={item.icon}
              iconColor={item.iconColor}
              bgColor={item.bgColor}
              animateValue={item.animateValue}
              category={item.category}
              onPress={onStatPress}
            />
          ))}
        </View>
      </BaseCard>
    );
  }
);

VocabularyDashboard.displayName = 'VocabularyDashboard';

const styles = StyleSheet.create({
  iconWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.SMALL,
  },
  mainCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  statValue: {
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.TINY,
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
