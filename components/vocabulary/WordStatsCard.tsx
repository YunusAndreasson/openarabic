import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from '@/components/ThemedText';
import BaseCard from '@/components/BaseCard';
import type { WordStatsData } from '@/hooks/useWordStats';

interface WordStatsCardProps {
  stats: WordStatsData;
}

type EmphasisLevel = 'primary' | 'secondary' | 'subtle';

interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  emphasis: EmphasisLevel;
}

const StatItem = memo(({ icon, iconColor, label, value, emphasis }: StatItemProps) => {
  const colors = useColors();

  // Enhanced emphasis styling with better visual hierarchy
  const emphasisStyles = useMemo(() => {
    switch (emphasis) {
      case 'primary':
        return {
          container: {
            backgroundColor: colors.elevation1,
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
            borderWidth: 1,
            borderColor: iconColor + '25',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          },
          iconBackground: iconColor + '20',
          iconSize: 18,
          valueWeight: 'bold' as const,
          valueSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 2,
          labelOpacity: 1,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.elevation1,
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
            borderWidth: 0.5,
            borderColor: colors.borderOverlay,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          },
          iconBackground: iconColor + '15',
          iconSize: 16,
          valueWeight: 'semibold' as const,
          valueSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
          labelOpacity: 0.95,
        };
      case 'subtle':
        return {
          container: {
            backgroundColor: colors.elevation1,
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
            borderWidth: 0.5,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 1,
            elevation: 1,
          },
          iconBackground: iconColor + '12',
          iconSize: 16,
          valueWeight: 'medium' as const,
          valueSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          labelOpacity: 0.85,
        };
    }
  }, [emphasis, colors, iconColor]);

  return (
    <View style={[styles.statItem, emphasisStyles.container]}>
      <View style={styles.statRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: emphasisStyles.iconBackground },
            emphasis === 'primary' && styles.primaryIconContainer,
          ]}
        >
          <Ionicons name={icon} size={emphasisStyles.iconSize} color={iconColor} />
        </View>

        <View style={styles.statTextContainer}>
          <ThemedText
            type="caption"
            weight="semibold"
            variant="secondary"
            style={[styles.statLabel, { opacity: emphasisStyles.labelOpacity }]}
          >
            {label}
          </ThemedText>
          <ThemedText
            weight={emphasisStyles.valueWeight}
            style={[styles.statValue, { fontSize: emphasisStyles.valueSize }]}
          >
            {value}
          </ThemedText>
        </View>
      </View>
    </View>
  );
});

StatItem.displayName = 'StatItem';

export const WordStatsCard = memo(({ stats }: WordStatsCardProps) => {
  const colors = useColors();

  // Sophisticated emphasis calculation for perfect visual hierarchy
  const {
    masteryInfo,
    stabilityText,
    difficultyText,
    successRateText,
    emphasisLevels,
    streakText,
    lastReviewText,
  } = useMemo(() => {
    // Calculate mastery level color and description
    const masteryInfo = (() => {
      switch (stats.masteryLevel) {
        case 'New':
          return { color: colors.textTertiary };
        case 'Learning':
          return { color: colors.info };
        case 'Review':
          return { color: colors.warning };
        case 'Mastered':
          return { color: colors.success };
        default:
          return { color: colors.textTertiary };
      }
    })();

    // Format values more compactly
    const stabilityText =
      stats.averageStability < 1
        ? '<1d'
        : stats.averageStability < 30
          ? `${Math.round(stats.averageStability)}d`
          : `${Math.round(stats.averageStability / 30)}mo`;

    const difficultyText = `${Math.round(stats.averageDifficulty * 100)}%`;
    const successRateText = `${Math.round(stats.successRate * 100)}%`;

    // Format streak information
    const streakText = stats.successStreak > 0 ? `${stats.successStreak}` : '0';

    // Format last review text
    const lastReviewText = (() => {
      if (stats.daysSinceLastReview === null) return 'Never';
      if (stats.daysSinceLastReview === 0) return 'Today';
      if (stats.daysSinceLastReview === 1) return 'Yesterday';
      if (stats.daysSinceLastReview <= 7) return `${stats.daysSinceLastReview}d ago`;
      if (stats.daysSinceLastReview <= 30)
        return `${Math.round(stats.daysSinceLastReview / 7)}w ago`;
      return `${Math.round(stats.daysSinceLastReview / 30)}mo ago`;
    })();

    // Smart emphasis system - creates balanced visual hierarchy
    const emphasisLevels = (() => {
      const scores = {
        status: 0,
        success: 0,
        retention: 0,
        difficulty: 0,
      };

      // Score based on performance and importance
      if (stats.masteryLevel === 'Mastered') scores.status += 3;
      else if (stats.masteryLevel === 'Learning') scores.status += 2;
      else if (stats.masteryLevel === 'Review') scores.status += 1;

      if (stats.successRate >= 0.8) scores.success += 3;
      else if (stats.successRate >= 0.6) scores.success += 2;
      else scores.success += 1; // Low success rate is important to highlight

      if (stats.averageStability >= 30) scores.retention += 3;
      else if (stats.averageStability >= 7) scores.retention += 2;
      else scores.retention += 1;

      if (stats.averageDifficulty < 6.5)
        scores.difficulty += 1; // Easy
      else if (stats.averageDifficulty < 8.0)
        scores.difficulty += 2; // Medium
      else scores.difficulty += 3; // Hard - High difficulty is important

      // Find the highest scoring stat for primary emphasis
      const maxScore = Math.max(scores.status, scores.success, scores.retention, scores.difficulty);

      // Create emphasis levels with guaranteed types
      const levels: Record<string, EmphasisLevel> = {
        status: 'subtle',
        success: 'subtle',
        retention: 'subtle',
        difficulty: 'subtle',
      };

      // Assign primary to highest score
      if (scores.status === maxScore) levels.status = 'primary';
      else if (scores.success === maxScore) levels.success = 'primary';
      else if (scores.retention === maxScore) levels.retention = 'primary';
      else if (scores.difficulty === maxScore) levels.difficulty = 'primary';

      // Assign secondary to above-average scores
      const avgScore = (scores.status + scores.success + scores.retention + scores.difficulty) / 4;
      if (scores.status >= avgScore && levels.status !== 'primary') levels.status = 'secondary';
      if (scores.success >= avgScore && levels.success !== 'primary') levels.success = 'secondary';
      if (scores.retention >= avgScore && levels.retention !== 'primary')
        levels.retention = 'secondary';
      if (scores.difficulty >= avgScore && levels.difficulty !== 'primary')
        levels.difficulty = 'secondary';

      return {
        status: levels.status as EmphasisLevel,
        success: levels.success as EmphasisLevel,
        retention: levels.retention as EmphasisLevel,
        difficulty: levels.difficulty as EmphasisLevel,
      };
    })();

    return {
      masteryInfo,
      stabilityText,
      difficultyText,
      successRateText,
      emphasisLevels,
      streakText,
      lastReviewText,
    };
  }, [stats, colors]);

  // Memoize color calculations with enhanced logic
  const successColor = useMemo(() => {
    if (stats.successRate >= 0.8) return colors.success;
    if (stats.successRate >= 0.6) return colors.warning;
    return colors.error;
  }, [stats.successRate, colors]);

  const difficultyColor = useMemo(() => {
    if (stats.averageDifficulty < 6.5) return colors.success;
    if (stats.averageDifficulty < 8.0) return colors.warning;
    return colors.error;
  }, [stats.averageDifficulty, colors]);

  const retentionColor = useMemo(() => {
    if (stats.averageStability >= 30) return colors.success;
    if (stats.averageStability >= 7) return colors.info;
    return colors.warning;
  }, [stats.averageStability, colors]);

  return (
    <BaseCard shadowSize="medium" style={styles.container}>
      <View style={styles.content}>
        {/* Enhanced 2x2 Grid Layout with better spacing */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatItem
              icon="school"
              iconColor={masteryInfo.color}
              label="Status"
              value={stats.masteryLevel}
              emphasis={emphasisLevels.status}
            />
            <StatItem
              icon="trending-up"
              iconColor={successColor}
              label="Success"
              value={successRateText}
              emphasis={emphasisLevels.success}
            />
          </View>

          <View style={styles.statsRow}>
            <StatItem
              icon="time"
              iconColor={retentionColor}
              label="Retention"
              value={stabilityText}
              emphasis={emphasisLevels.retention}
            />
            <StatItem
              icon="analytics"
              iconColor={difficultyColor}
              label="Difficulty"
              value={difficultyText}
              emphasis={emphasisLevels.difficulty}
            />
          </View>
        </View>

        {/* Enhanced footer with better visual hierarchy */}
        {(stats.totalReviews > 0 || stats.successStreak > 0) && (
          <View
            style={[
              styles.footerContainer,
              {
                backgroundColor: colors.elevation1,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.footerContent}>
              {stats.successStreak > 0 && (
                <View style={styles.streakContainer}>
                  <View style={[styles.streakBadge, { backgroundColor: colors.warning + '20' }]}>
                    <ThemedText style={styles.streakEmoji}>🔥</ThemedText>
                    <ThemedText
                      type="caption"
                      weight="semibold"
                      style={[styles.footerText, { color: colors.warning }]}
                    >
                      {streakText}
                    </ThemedText>
                  </View>
                </View>
              )}

              <View style={styles.reviewInfo}>
                {stats.totalReviews > 0 && (
                  <View style={styles.reviewContainer}>
                    <Ionicons name="calendar" size={12} color={colors.textTertiary} />
                    <ThemedText type="caption" variant="subtle" style={styles.footerText}>
                      {lastReviewText}
                    </ThemedText>
                  </View>
                )}

                {stats.totalReviews > 1 && (
                  <ThemedText type="caption" variant="subtle" style={styles.reviewCount}>
                    {stats.totalReviews} reviews
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </BaseCard>
  );
});

WordStatsCard.displayName = 'WordStatsCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  content: {
    padding: LAYOUT.SPACING.LARGE,
  },
  statsGrid: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  statsRow: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  statItem: {
    flex: 1,
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: 60,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  primaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  statTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1,
  },
  footerContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakContainer: {
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    alignSelf: 'flex-start',
  },
  streakEmoji: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginRight: LAYOUT.SPACING.TINY,
  },
  reviewInfo: {
    alignItems: 'flex-end',
    gap: LAYOUT.SPACING.TINY / 2,
  },
  reviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  footerText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
  },
  reviewCount: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.2,
    opacity: 0.7,
  },
});
