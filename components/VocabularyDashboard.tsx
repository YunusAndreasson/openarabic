import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';

interface VocabularyDashboardProps {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
  streak: number;
  colors: any;
}

// Separate StatItem component for better reusability and memoization
const StatItem = React.memo(
  ({
    value,
    label,
    icon,
    iconColor,
    bgColor,
  }: {
    value: number;
    label: string;
    icon: string;
    iconColor: string;
    bgColor: string;
  }) => (
    <View style={styles.statItem}>
      <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  )
);

StatItem.displayName = 'StatItem';

export const VocabularyDashboard = React.memo(
  ({
    totalWords,
    dueWords,
    masteredWords,
    learningWords,
    streak,
    colors,
  }: VocabularyDashboardProps) => {
    // Calculate mastery percentage
    const masteryPercentage = useMemo(
      () => (totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0),
      [totalWords, masteredWords]
    );

    // Ensure colors are bright enough for dark mode
    const primaryColor = colors.primary || '#3498db';
    const accentColor = colors.accent || '#ff9500';
    const successColor = colors.success || '#2ecc71';
    const textColor = colors.text || '#000000';

    // Prepare stat items data
    const statItems = useMemo(
      () => [
        {
          value: totalWords,
          label: 'Total',
          icon: 'book-outline',
          iconColor: textColor,
          bgColor: textColor + '15',
        },
        {
          value: masteredWords,
          label: 'Mastered',
          icon: 'checkmark-circle-outline',
          iconColor: successColor,
          bgColor: successColor + '15',
        },
        {
          value: learningWords,
          label: 'Learning',
          icon: 'school-outline',
          iconColor: primaryColor,
          bgColor: primaryColor + '20',
        },
        {
          value: streak,
          label: 'Streak',
          icon: 'flame',
          iconColor: accentColor,
          bgColor: accentColor + '20',
        },
      ],
      [
        totalWords,
        masteredWords,
        learningWords,
        streak,
        textColor,
        successColor,
        primaryColor,
        accentColor,
      ]
    );

    return (
      <View
        style={[
          styles.mainCard,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
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
            />
          ))}
        </View>

        {/* Mastery Progress */}
        <View style={styles.masteryContainer}>
          <View style={styles.masteryLabelRow}>
            <ThemedText style={styles.masteryLabel}>Mastery</ThemedText>
            <ThemedText style={styles.masteryPercentage}>{masteryPercentage}%</ThemedText>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: colors.cardBorder + '40' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${masteryPercentage}%`,
                  backgroundColor: successColor,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }
);

VocabularyDashboard.displayName = 'VocabularyDashboard';

const styles = StyleSheet.create({
  mainCard: {
    width: '100%',
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
