import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import type { VocabularyStats } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';

import { LAYOUT } from '../../constants/layout';
import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

type StatCategory = 'total' | 'mastered' | 'learning' | 'due';

interface VocabularyDashboardProps
  extends Pick<VocabularyStats, 'totalWords' | 'dueWords' | 'masteredWords' | 'learningWords'> {
  onStatPress?: (category: StatCategory) => void;
}

interface StatItemProps {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  category: StatCategory;
  onPress?: (category: StatCategory) => void;
}

// Separate StatItem component for better reusability and memoization
const StatItem = memo(
  ({ value, label, icon, iconColor, bgColor, borderColor, category, onPress }: StatItemProps) => {
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
        >
          <View style={[styles.iconWrapper, { backgroundColor: bgColor, borderColor }]}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
          <ThemedText type="body" weight="bold" style={styles.statValue}>
            {value}
          </ThemedText>
          <ThemedText type="caption" variant="secondary" weight="medium">
            {label}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

StatItem.displayName = 'StatItem';

export const VocabularyDashboard = memo(
  ({
    totalWords = 0,
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStatPress,
  }: VocabularyDashboardProps) => {
    const colors = useColors();

    // Prepare stat items data
    const statItems: StatItemProps[] = useMemo(
      () => [
        {
          value: totalWords,
          label: 'Total',
          icon: 'book-outline',
          iconColor: colors.text,
          bgColor: withOpacity(colors.text, 0.19),
          borderColor: colors.text + '40',
          category: 'total',
        },
        {
          value: masteredWords,
          label: 'Mastered',
          icon: 'checkmark-circle-outline',
          iconColor: colors.success,
          bgColor: withOpacity(colors.success, 0.19),
          borderColor: colors.success + '40',
          category: 'mastered',
        },
        {
          value: learningWords,
          label: 'Learning',
          icon: 'school-outline',
          iconColor: colors.info,
          bgColor: withOpacity(colors.info, 0.19),
          borderColor: colors.info + '40',
          category: 'learning',
        },
        {
          value: dueWords,
          label: 'Review',
          icon: 'alarm-outline',
          iconColor: colors.warning,
          bgColor: withOpacity(colors.warning, 0.19),
          borderColor: colors.warning + '40',
          category: 'due',
        },
      ],
      [totalWords, masteredWords, learningWords, dueWords, colors]
    );

    return (
      <BaseCard style={styles.mainCard} includePressAnimation={false} shadowSize="medium">
        <View style={styles.header}>
          <ThemedText type="overline" weight="medium" variant="secondary">
            VOCABULARY STATS
          </ThemedText>
        </View>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {statItems.map(item => (
            <StatItem
              key={`vocab-stat-${item.category}`}
              value={item.value}
              label={item.label}
              icon={item.icon}
              iconColor={item.iconColor}
              bgColor={item.bgColor}
              borderColor={item.borderColor}
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
    borderWidth: 1.5,
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
  header: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
