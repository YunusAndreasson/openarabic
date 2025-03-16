import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';
import { Colors } from '../constants/Colors';
import { VocabularyStats } from '@/types/vocabulary.types';
import { useColors } from '../hooks/useColors';
import AnimatedThemedText from './AnimatedThemedText';
import { useProgressAnimation, usePressAnimation } from '@/hooks/animations';
import { ProgressBar } from './ProgressBar';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';

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
            <Ionicons name={icon as any} size={18} color={iconColor} />
          </View>
          <AnimatedThemedText style={styles.statValue} animate={animateValue}>
            {value}
          </AnimatedThemedText>
          <ThemedText style={styles.statLabel}>{label}</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

StatItem.displayName = 'StatItem';

// Separate MasteryHeader component for better reusability and memoization
const MasteryHeader = React.memo(({ percentage }: { percentage: number }) => (
  <View style={styles.masteryLabelRow}>
    <ThemedText style={styles.masteryLabel} accessibilityLabel={`Words mastery: ${percentage}%`}>
      Mastery
    </ThemedText>
    <ThemedText style={styles.masteryPercentage}>{percentage}%</ThemedText>
  </View>
));

MasteryHeader.displayName = 'MasteryHeader';

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
    // Calculate mastery percentage
    const masteryPercentage = useMemo(
      () => (totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0),
      [totalWords, masteredWords]
    );

    // Ensure colors are bright enough for dark mode with fallbacks
    const safeColors = useMemo(
      () => ({
        primaryColor: colors.primary || '#3498db',
        accentColor: colors.accent || '#ff9500',
        successColor: colors.success || '#2ecc71',
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
          bgColor: safeColors.textColor + '15',
          animateValue: animationTriggered,
          category: 'total' as const,
        },
        {
          value: masteredWords,
          label: 'Mastered',
          icon: 'checkmark-circle',
          iconColor: safeColors.successColor,
          bgColor: safeColors.successColor + '15',
          animateValue: animationTriggered,
          category: 'mastered' as const,
        },
        {
          value: learningWords,
          label: 'Learning',
          icon: 'school',
          iconColor: safeColors.primaryColor,
          bgColor: safeColors.primaryColor + '20',
          animateValue: animationTriggered,
          category: 'learning' as const,
        },
        {
          value: dueWords,
          label: 'Due',
          icon: 'alarm',
          iconColor: safeColors.dueWordsColor,
          bgColor: safeColors.dueWordsColor + '20',
          animateValue: animationTriggered,
          category: 'due' as const,
        },
      ],
      [totalWords, masteredWords, learningWords, dueWords, safeColors, animationTriggered]
    );

    return (
      <View
        style={[
          styles.mainCard,
          {
            backgroundColor: safeColors.cardBackground,
            borderColor: safeColors.cardBorder,
          },
        ]}
      >
        {/* Top Stats Row */}
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

        {/* Mastery Progress */}
        <View style={styles.masteryContainer}>
          <MasteryHeader percentage={masteryPercentage} />
          <ProgressBar
            progress={masteryPercentage}
            backgroundColor={safeColors.cardBorder + '40'}
            fillColor={safeColors.successColor}
            height={8}
            animationTriggered={animationTriggered}
          />
        </View>
      </View>
    );
  }
);

VocabularyDashboard.displayName = 'VocabularyDashboard';

const styles = StyleSheet.create({
  mainCard: {
    width: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  statItem: {
    alignItems: 'center',
  },
  iconWrapper: {
    backgroundColor: 'transparent',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '700',
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  masteryContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  masteryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  masteryLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
  },
  masteryPercentage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '700',
  },
});
