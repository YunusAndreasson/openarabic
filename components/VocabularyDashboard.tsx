import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';
import { VocabularyStats } from '@/types/vocabulary.types';
import { AnimatedText } from './index';
import { usePressAnimation } from '@/hooks/animations';
import Animated from 'react-native-reanimated';
import BaseCard from './BaseCard';

// Using subset of properties from the VocabularyStats type for this component
interface VocabularyDashboardProps
  extends Pick<VocabularyStats, 'totalWords' | 'dueWords' | 'masteredWords' | 'learningWords'> {
  colors: any;
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
  ({ value, label, icon, iconColor, bgColor, animateValue, category, onPress }: StatItemProps) => {
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
      <Animated.View style={animatedStyle as any}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
          disabled={!onPress}
        >
          <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <AnimatedText type="heading3">{value}</AnimatedText>
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
    totalWords,
    masteredWords,
    learningWords,
    dueWords,
    colors,
    animationTriggered = false,
    onStatPress,
    streakStats,
  }: VocabularyDashboardProps) => {
    // Ensure colors are bright enough for dark mode with fallbacks
    const safeColors = useMemo(
      () => ({
        tintColor: colors.tint || '#3498db',
        accentColor: colors.accent || '#ff9500',
        successColor: colors.success || '#2ecc71',
        infoColor: colors.info || '#339AF0',
        textColor: colors.text || '#000000',
        cardBackground: colors.cardBackground || '#ffffff',
        cardBorder: colors.cardBorder || '#e0e0e0',
        dueWordsColor: colors.warning || '#FCC419',
      }),
      [colors]
    );

    // Prepare stat items data
    const statItems = useMemo(
      () => [
        {
          value: totalWords,
          label: 'Total',
          icon: 'book',
          iconColor: safeColors.textColor,
          bgColor: safeColors.textColor + '30',
          animateValue: animationTriggered,
          category: 'total' as const,
        },
        {
          value: masteredWords,
          label: 'Mastered',
          icon: 'checkmark-circle',
          iconColor: safeColors.successColor,
          bgColor: safeColors.successColor + '30',
          animateValue: animationTriggered,
          category: 'mastered' as const,
        },
        {
          value: learningWords,
          label: 'Learning',
          icon: 'school',
          iconColor: safeColors.infoColor,
          bgColor: safeColors.infoColor + '30',
          animateValue: animationTriggered,
          category: 'learning' as const,
        },
        {
          value: dueWords,
          label: 'Review',
          icon: 'alarm',
          iconColor: safeColors.dueWordsColor,
          bgColor: safeColors.dueWordsColor + '30',
          animateValue: animationTriggered,
          category: 'due' as const,
        },
      ],
      [totalWords, masteredWords, learningWords, dueWords, safeColors, animationTriggered]
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
  mainCard: {
    width: '100%',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
  iconWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.DIMMED,
    fontWeight: '500',
  },
});
