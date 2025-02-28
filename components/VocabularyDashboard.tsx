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

interface StatItemProps {
  value: number;
  label: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

// Separate StatItem component for better reusability and memoization
const StatItem = React.memo(({ value, label, icon, iconColor, bgColor }: StatItemProps) => (
  <View style={styles.statItem}>
    <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
      <Ionicons name={icon as any} size={18} color={iconColor} />
    </View>
    <ThemedText style={styles.statValue}>{value}</ThemedText>
    <ThemedText style={styles.statLabel}>{label}</ThemedText>
  </View>
));

StatItem.displayName = 'StatItem';

// Separate ProgressBar component for better reusability and memoization
const ProgressBar = React.memo(
  ({
    percentage,
    backgroundColor,
    fillColor,
  }: {
    percentage: number;
    backgroundColor: string;
    fillColor: string;
  }) => (
    <View style={[styles.progressBarBg, { backgroundColor }]}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${percentage}%`,
            backgroundColor: fillColor,
          },
        ]}
      />
    </View>
  )
);

ProgressBar.displayName = 'ProgressBar';

// Separate MasteryHeader component for better reusability and memoization
const MasteryHeader = React.memo(({ percentage }: { percentage: number }) => (
  <View style={styles.masteryLabelRow}>
    <ThemedText style={styles.masteryLabel}>Mastery</ThemedText>
    <ThemedText style={styles.masteryPercentage}>{percentage}%</ThemedText>
  </View>
));

MasteryHeader.displayName = 'MasteryHeader';

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

    // Ensure colors are bright enough for dark mode with fallbacks
    const safeColors = useMemo(
      () => ({
        primaryColor: colors.primary || '#3498db',
        accentColor: colors.accent || '#ff9500',
        successColor: colors.success || '#2ecc71',
        textColor: colors.text || '#000000',
        cardBackground: colors.cardBackground || '#ffffff',
        cardBorder: colors.cardBorder || '#e0e0e0',
      }),
      [colors]
    );

    // Prepare stat items data
    const statItems = useMemo(
      () => [
        {
          value: totalWords,
          label: 'Total',
          icon: 'book-outline',
          iconColor: safeColors.textColor,
          bgColor: safeColors.textColor + '15',
        },
        {
          value: masteredWords,
          label: 'Mastered',
          icon: 'checkmark-circle-outline',
          iconColor: safeColors.successColor,
          bgColor: safeColors.successColor + '15',
        },
        {
          value: learningWords,
          label: 'Learning',
          icon: 'school-outline',
          iconColor: safeColors.primaryColor,
          bgColor: safeColors.primaryColor + '20',
        },
        {
          value: streak,
          label: 'Streak',
          icon: 'flame',
          iconColor: safeColors.accentColor,
          bgColor: safeColors.accentColor + '20',
        },
      ],
      [totalWords, masteredWords, learningWords, streak, safeColors]
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
            />
          ))}
        </View>

        {/* Mastery Progress */}
        <View style={styles.masteryContainer}>
          <MasteryHeader percentage={masteryPercentage} />
          <ProgressBar
            percentage={masteryPercentage}
            backgroundColor={safeColors.cardBorder + '40'}
            fillColor={safeColors.successColor}
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
