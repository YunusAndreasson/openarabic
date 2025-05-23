import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import { Canvas, Path, Circle, Group, Rect } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { VocabularyStats, StudyWord, StatCategory } from '@/types/vocabulary.types';
import { useStreakData } from '@/hooks/useStreakData';
import { useAuth } from '@/hooks/useAuth';
import { lightFeedback } from '@/utils/haptics';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';
import { LearningGauge } from './LearningGauge';
import { InfoModal, type InfoModalType } from './InfoModal';

interface VocabularyStatCardsProps
  extends Pick<VocabularyStats, 'dueWords' | 'masteredWords' | 'learningWords'> {
  onStatPress?: (category: StatCategory) => void;
  studyWords?: StudyWord[];
}

interface StatCardProps {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  category: StatCategory;
  onPress?: (category: StatCategory) => void;
}

// Individual stat card component with perfect UX and original color scheme
const StatCard = memo(
  ({ value, label, icon, iconColor, bgColor, borderColor, category, onPress }: StatCardProps) => {
    const colors = useColors();

    const handlePress = () => {
      if (onPress) {
        lightFeedback();
        onPress(category);
      }
    };

    return (
      <BaseCard
        onPress={handlePress}
        style={styles.statCard}
        shadowSize="small"
        includePressAnimation={true}
      >
        <View style={styles.cardContent}>
          {/* Left side - Icon with original color scheme */}
          <View style={[styles.iconContainer, { backgroundColor: bgColor, borderColor }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>

          {/* Center - Main content with improved hierarchy */}
          <View style={styles.contentCenter}>
            <ThemedText type="heading2" weight="bold" style={styles.statValue}>
              {value.toLocaleString()}
            </ThemedText>
            <ThemedText type="body" weight="medium" variant="secondary" style={styles.statLabel}>
              {label}
            </ThemedText>
          </View>

          {/* Right side - Navigation indicator */}
          <View style={styles.contentRight}>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color={colors.textTertiary}
              style={styles.navigationIcon}
            />
          </View>
        </View>
      </BaseCard>
    );
  }
);

StatCard.displayName = 'StatCard';

// Info icon component for card headers
const InfoIcon = memo(({ onPress }: { onPress: () => void }) => {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.infoIcon, { backgroundColor: withOpacity(colors.textTertiary, 0.1) }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="information-outline" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
});

InfoIcon.displayName = 'InfoIcon';

// Streak insights component with clean design and info icon
const StreakInsights = memo(({ onInfoPress }: { onInfoPress: () => void }) => {
  const colors = useColors();
  const { user } = useAuth();
  const streakData = useStreakData(user?.id);

  // Calculate streak status for visual feedback
  const streakStatus = useMemo(() => {
    const { currentStreak } = streakData;

    if (currentStreak === 0) {
      return {
        color: colors.textTertiary,
      };
    }

    if (currentStreak >= 7) {
      return {
        color: colors.success,
      };
    }

    if (currentStreak >= 3) {
      return {
        color: colors.warning,
      };
    }

    return {
      color: colors.info,
    };
  }, [streakData, colors]);

  // Activity dots for last 7 days - simplified and cleaner
  const activityDots = useMemo(() => {
    return streakData.lastSevenDaysActivity.map((day, index) => {
      const isActive = day.active;
      const isToday = index === streakData.lastSevenDaysActivity.length - 1;

      return (
        <View key={`activity-${index}`} style={styles.activityDot}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? colors.success : withOpacity(colors.textTertiary, 0.2),
                borderWidth: isToday ? 2 : 0,
                borderColor: isToday ? colors.tint : 'transparent',
              },
            ]}
          />
          <ThemedText type="caption" variant="subtle" style={styles.dayLabel}>
            {day.dayName}
          </ThemedText>
        </View>
      );
    });
  }, [streakData.lastSevenDaysActivity, colors]);

  return (
    <BaseCard style={styles.streakCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.streakContent}>
        {/* Card Title - Prominent and consistent */}
        <View style={styles.cardHeader}>
          <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
            Streak
          </ThemedText>
          <InfoIcon onPress={onInfoPress} />
        </View>
        <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
          {streakData.currentStreak === 0
            ? 'Start today to begin your streak'
            : streakData.currentStreak >= 7
              ? 'Excellent consistency!'
              : 'Keep it up!'}
        </ThemedText>

        {/* Stats display - consistent with other cards */}
        <View style={styles.progressStatsRow}>
          <View style={styles.progressStat}>
            <ThemedText
              type="heading2"
              weight="bold"
              style={[styles.progressValue, { color: streakStatus.color }]}
            >
              {streakData.currentStreak}
            </ThemedText>
            <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
              current
            </ThemedText>
          </View>
          <View style={styles.progressStat}>
            <ThemedText type="heading3" weight="bold" style={styles.progressValue}>
              {streakData.longestStreak}
            </ThemedText>
            <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
              best
            </ThemedText>
          </View>
        </View>

        {/* Activity visualization - cleaner layout */}
        <View
          style={[
            styles.activitySection,
            { borderTopColor: withOpacity(colors.textTertiary, 0.1) },
          ]}
        >
          <View style={styles.activityRow}>{activityDots}</View>
        </View>
      </View>
    </BaseCard>
  );
});

StreakInsights.displayName = 'StreakInsights';

// Progress graph component with Skia visualization
const ProgressGraph = memo(
  ({ studyWords = [], onInfoPress }: { studyWords: StudyWord[]; onInfoPress: () => void }) => {
    const colors = useColors();
    const screenWidth = Dimensions.get('window').width;
    const graphWidth =
      screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
    const graphHeight = 100; // Reduced height for better hierarchy

    // Calculate progress data over the last 14 days (shorter period for more relevant insights)
    const progressData = useMemo(() => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const days = 14; // Reduced from 30 to 14 for more actionable insights
      const dataPoints: Array<{
        date: Date;
        newWords: number;
        reviewsToday: number;
      }> = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(23, 59, 59, 999);

        let newWords = 0;
        let reviewsToday = 0;

        studyWords.forEach(word => {
          const createdAt = new Date(word.created_at);
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          // Count words added on this specific day
          if (createdAt.toDateString() === date.toDateString()) {
            newWords++;
          }

          // Count reviews done on this specific day (any review activity)
          if (
            lastReview &&
            lastReview.toDateString() === date.toDateString() &&
            (word.fsrs_reps ?? 0) > 0
          ) {
            reviewsToday++;
          }
        });

        dataPoints.push({
          date,
          newWords,
          reviewsToday,
        });
      }

      return dataPoints;
    }, [studyWords]);

    // Calculate graph paths for daily activity
    const { reviewPath, maxValue, hasData } = useMemo(() => {
      if (progressData.length === 0) {
        return { reviewPath: '', maxValue: 1, hasData: false };
      }

      const maxActivity = Math.max(1, Math.max(...progressData.map(d => d.newWords)));
      const maxReviews = Math.max(1, Math.max(...progressData.map(d => d.reviewsToday)));
      const maxValue = Math.max(maxActivity, maxReviews);

      const stepX = graphWidth / (progressData.length - 1);
      const hasData = progressData.some(d => d.newWords > 0 || d.reviewsToday > 0);

      let reviewPath = '';

      progressData.forEach((data, index) => {
        const x = index * stepX;
        const reviewY = graphHeight - (data.reviewsToday / maxValue) * graphHeight;

        if (index === 0) {
          reviewPath = `M ${x} ${reviewY}`;
        } else {
          reviewPath += ` L ${x} ${reviewY}`;
        }
      });

      return { reviewPath, maxValue, hasData };
    }, [progressData, graphWidth, graphHeight]);

    // Calculate insights instead of raw totals
    const insights = useMemo(() => {
      const recentDays = progressData.slice(-7);
      const totalNewWords = recentDays.reduce((sum, day) => sum + day.newWords, 0);
      const totalReviews = recentDays.reduce((sum, day) => sum + day.reviewsToday, 0);
      const avgDaily = (totalNewWords + totalReviews) / 7;

      return {
        weeklyNewWords: totalNewWords,
        weeklyReviews: totalReviews,
        dailyAverage: Math.round(avgDaily * 10) / 10,
      };
    }, [progressData]);

    if (!hasData) {
      return (
        <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.progressContent}>
            {/* Card Title - Prominent and consistent */}
            <View style={styles.cardHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
                Activity
              </ThemedText>
              <InfoIcon onPress={onInfoPress} />
            </View>
            <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
              Add words while reading to track activity
            </ThemedText>
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          {/* Card Title - Prominent and consistent */}
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
              Activity
            </ThemedText>
            <InfoIcon onPress={onInfoPress} />
          </View>
          <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
            {insights.weeklyNewWords + insights.weeklyReviews === 0
              ? 'No activity this week'
              : insights.dailyAverage >= 3
                ? 'Great momentum this week!'
                : insights.weeklyNewWords + insights.weeklyReviews >= 5
                  ? 'Good progress this week'
                  : 'Try to be more active'}
          </ThemedText>

          {/* Stats display */}
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStat}>
              <ThemedText type="heading2" weight="bold" style={styles.progressValue}>
                {insights.dailyAverage}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                daily avg
              </ThemedText>
            </View>
            <View style={styles.progressStat}>
              <ThemedText
                type="heading3"
                weight="bold"
                style={[styles.progressValue, { color: colors.tint }]}
              >
                {insights.weeklyNewWords + insights.weeklyReviews}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                this week
              </ThemedText>
            </View>
          </View>

          {/* Enhanced Graph with improved styling */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: graphWidth, height: graphHeight }}>
              {/* Background grid lines for better readability */}
              <Group>
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Path
                    key={`grid-line-${index}`}
                    path={`M 0 ${graphHeight * ratio} L ${graphWidth} ${graphHeight * ratio}`}
                    style="stroke"
                    strokeWidth={0.5}
                    color={withOpacity(colors.text, 0.1)}
                  />
                ))}
              </Group>

              {/* Activity bars with gradient effect */}
              <Group>
                {progressData.map((data, index) => {
                  const x = (index * graphWidth) / (progressData.length - 1);
                  const barHeight = (data.newWords / maxValue) * graphHeight;
                  const barWidth = Math.max(2, (graphWidth / progressData.length) * 0.6);

                  if (barHeight > 0) {
                    return (
                      <Group key={`activity-bar-${index}`}>
                        {/* Bar shadow */}
                        <Path
                          path={`M ${x - barWidth / 2 + 1} ${graphHeight + 1} L ${x - barWidth / 2 + 1} ${graphHeight - barHeight + 1} L ${x + barWidth / 2 + 1} ${graphHeight - barHeight + 1} L ${x + barWidth / 2 + 1} ${graphHeight + 1} Z`}
                          color={withOpacity(colors.text, 0.1)}
                        />
                        {/* Main bar */}
                        <Path
                          path={`M ${x - barWidth / 2} ${graphHeight} L ${x - barWidth / 2} ${graphHeight - barHeight} L ${x + barWidth / 2} ${graphHeight - barHeight} L ${x + barWidth / 2} ${graphHeight} Z`}
                          color={colors.info}
                        />
                        {/* Bar highlight */}
                        <Path
                          path={`M ${x - barWidth / 2} ${graphHeight - barHeight} L ${x - barWidth / 2 + 2} ${graphHeight - barHeight} L ${x - barWidth / 2 + 2} ${graphHeight} L ${x - barWidth / 2} ${graphHeight} Z`}
                          color={withOpacity(colors.background, 0.3)}
                        />
                      </Group>
                    );
                  }
                  return null;
                })}
              </Group>

              {/* Mastery line with glow effect */}
              <Group>
                {/* Glow effect */}
                <Path
                  path={reviewPath}
                  style="stroke"
                  strokeWidth={6}
                  color={withOpacity(colors.success, 0.2)}
                />
                {/* Main line */}
                <Path path={reviewPath} style="stroke" strokeWidth={3} color={colors.success} />
              </Group>

              {/* Enhanced review points */}
              <Group>
                {progressData.map((data, index) => {
                  if (data.reviewsToday > 0) {
                    const x = (index * graphWidth) / (progressData.length - 1);
                    const y = graphHeight - (data.reviewsToday / maxValue) * graphHeight;
                    return (
                      <Group key={`review-point-${index}`}>
                        {/* Point glow */}
                        <Circle cx={x} cy={y} r={6} color={withOpacity(colors.success, 0.3)} />
                        {/* Main point */}
                        <Circle cx={x} cy={y} r={4} color={colors.success} />
                        {/* Inner highlight */}
                        <Circle cx={x} cy={y} r={2} color={withOpacity(colors.background, 0.8)} />
                      </Group>
                    );
                  }
                  return null;
                })}
              </Group>

              {/* Data point indicators for recent activity */}
              <Group>
                {progressData.slice(-7).map((data, index) => {
                  const actualIndex = progressData.length - 7 + index;
                  if (actualIndex < 0) return null;

                  const x = (actualIndex * graphWidth) / (progressData.length - 1);
                  const hasActivity = data.newWords > 0 || data.reviewsToday > 0;

                  if (hasActivity) {
                    return (
                      <Circle
                        key={`activity-indicator-${actualIndex}`}
                        cx={x}
                        cy={graphHeight + 8}
                        r={2}
                        color={withOpacity(colors.tint, 0.6)}
                      />
                    );
                  }
                  return null;
                })}
              </Group>
            </Canvas>
          </View>

          {/* Enhanced Footer with comprehensive legend */}
          <View
            style={[
              styles.progressFooter,
              { borderTopColor: withOpacity(colors.textTertiary, 0.1) },
            ]}
          >
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBar, { backgroundColor: colors.info }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  New words
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.success }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  Reviews
                </ThemedText>
              </View>
            </View>
            <View style={styles.timeRange}>
              <ThemedText type="caption" variant="disabled" style={styles.timeRangeText}>
                Last 14 days
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

ProgressGraph.displayName = 'ProgressGraph';

// Progress distribution component showing new/learning/mastered progression
const ProgressDistribution = memo(
  ({ studyWords = [], onInfoPress }: { studyWords: StudyWord[]; onInfoPress: () => void }) => {
    const colors = useColors();
    const screenWidth = Dimensions.get('window').width;
    const graphWidth =
      screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
    const graphHeight = 100;

    // Calculate distribution data over the last 14 days
    const distributionData = useMemo(() => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const days = 14;
      const dataPoints: Array<{
        date: Date;
        newWords: number;
        learningWords: number;
        masteredWords: number;
        total: number;
      }> = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(23, 59, 59, 999);

        let newWords = 0;
        let learningWords = 0;
        let masteredWords = 0;

        studyWords.forEach(word => {
          const createdAt = new Date(word.created_at);

          // Only count words that existed by this date
          if (createdAt <= date) {
            // Use real FSRS states based on current word state
            const state = word.fsrs_state;
            const stability = word.fsrs_stability ?? 0;

            // FSRS State definitions (corrected based on actual data):
            // 0 = New (never reviewed)
            // 1 = Learning (in learning phase)
            // 2 = Review (graduated to review) - MASTERED when stability >= 5 days
            // 3 = Relearning (failed and relearning)

            if (state === 0 || !word.fsrs_last_review) {
              // New words: state 0 or never reviewed
              newWords++;
            } else if (state === 1 || state === 3 || (state === 2 && stability < 5)) {
              // Learning: states 1, 3 (relearning), or review with low stability
              learningWords++;
            } else if (state === 2 && stability >= 5) {
              // Mastered: review state with good stability (5+ days)
              masteredWords++;
            } else {
              // Fallback for any edge cases - treat as learning
              learningWords++;
            }
          }
        });

        const total = newWords + learningWords + masteredWords;
        dataPoints.push({
          date,
          newWords,
          learningWords,
          masteredWords,
          total,
        });
      }

      return dataPoints;
    }, [studyWords]);

    // Calculate stacked area paths
    const { masteryPath, progressDots, hasData, trendData } = useMemo(() => {
      if (distributionData.length === 0) {
        return { masteryPath: '', progressDots: [], hasData: false, trendData: [] };
      }

      const hasData = distributionData.some(d => d.total > 0);

      if (!hasData) {
        return { masteryPath: '', progressDots: [], hasData: false, trendData: [] };
      }

      const stepX = graphWidth / (distributionData.length - 1);

      // Calculate mastery percentage for each day
      const trendData = distributionData.map((data, index) => {
        const masteryPercentage = data.total > 0 ? (data.masteredWords / data.total) * 100 : 0;
        const x = index * stepX;
        const y = graphHeight - (masteryPercentage / 100) * graphHeight;

        return {
          x,
          y,
          percentage: masteryPercentage,
          date: data.date,
          total: data.total,
          mastered: data.masteredWords,
          learning: data.learningWords,
          new: data.newWords,
        };
      });

      // Create smooth line path
      let masteryPath = '';
      const progressDots: Array<{
        x: number;
        y: number;
        percentage: number;
        isSignificant: boolean;
      }> = [];

      trendData.forEach((point, index) => {
        if (index === 0) {
          masteryPath = `M ${point.x} ${point.y}`;
        } else {
          // Create smooth curve using quadratic bezier
          const prevPoint = trendData[index - 1];
          if (prevPoint) {
            const controlX = (prevPoint.x + point.x) / 2;
            masteryPath += ` Q ${controlX} ${prevPoint.y} ${point.x} ${point.y}`;
          }
        }

        // Add significant progress dots (every few days or significant changes)
        const prevPoint = index > 0 ? trendData[index - 1] : null;
        const isSignificant =
          index % 3 === 0 || (prevPoint && Math.abs(point.percentage - prevPoint.percentage) > 5);

        if (isSignificant && point.total > 0) {
          progressDots.push({
            x: point.x,
            y: point.y,
            percentage: point.percentage,
            isSignificant: true,
          });
        }
      });

      return {
        masteryPath,
        progressDots,
        hasData,
        trendData,
      };
    }, [distributionData, graphWidth, graphHeight]);

    // Calculate insights
    const masteryInsights = useMemo(() => {
      if (!trendData || trendData.length < 2) {
        return { currentMastery: 0, weeklyChange: 0, trend: 'stable' as const };
      }

      const latest = trendData[trendData.length - 1];
      const weekAgo = trendData[Math.max(0, trendData.length - 8)]; // Week ago

      const currentMastery = latest?.percentage || 0;
      const previousMastery = weekAgo?.percentage || 0;
      const weeklyChange = currentMastery - previousMastery;

      return {
        currentMastery: Math.round(currentMastery * 10) / 10,
        weeklyChange: Math.round(weeklyChange * 10) / 10,
        trend: weeklyChange > 2 ? 'improving' : weeklyChange < -2 ? 'declining' : 'stable',
      };
    }, [trendData]);

    if (!hasData) {
      return (
        <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.progressContent}>
            {/* Card Title - Prominent and consistent */}
            <View style={styles.cardHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
                Mastery
              </ThemedText>
              <InfoIcon onPress={onInfoPress} />
            </View>
            <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
              Review words regularly to build mastery
            </ThemedText>
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          {/* Card Title - Prominent and consistent */}
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
              Mastery
            </ThemedText>
            <InfoIcon onPress={onInfoPress} />
          </View>
          <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
            {masteryInsights.currentMastery === 0
              ? 'Start reviewing to build mastery'
              : masteryInsights.weeklyChange > 2
                ? 'Excellent progress this week!'
                : masteryInsights.weeklyChange > 0
                  ? 'Steady improvement'
                  : masteryInsights.weeklyChange < -2
                    ? 'Focus on reviewing more'
                    : 'Keep reviewing consistently'}
          </ThemedText>
        </View>

        {/* Stats display */}
        <View style={styles.progressStatsRow}>
          <View style={styles.progressStat}>
            <ThemedText type="heading2" weight="bold" style={styles.progressValue}>
              {masteryInsights.currentMastery}%
            </ThemedText>
            <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
              mastered
            </ThemedText>
          </View>
          <View style={styles.progressStat}>
            <ThemedText type="heading3" weight="bold" style={styles.progressValue}>
              {trendData[trendData.length - 1]?.mastered || 0}
            </ThemedText>
            <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
              words
            </ThemedText>
          </View>
        </View>

        {/* Enhanced Mastery Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: graphWidth, height: graphHeight }}>
            {/* Background grid lines */}
            <Group>
              {[0.25, 0.5, 0.75].map((ratio, index) => (
                <Path
                  key={`mastery-grid-${index}`}
                  path={`M 0 ${graphHeight * ratio} L ${graphWidth} ${graphHeight * ratio}`}
                  style="stroke"
                  strokeWidth={0.5}
                  color={withOpacity(colors.text, 0.1)}
                />
              ))}
            </Group>

            {/* Mastery area fill */}
            <Group>
              {trendData.length > 1 && (
                <Path
                  path={`${masteryPath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
                  color={withOpacity(colors.success, 0.1)}
                />
              )}
            </Group>

            {/* Mastery line with enhanced styling */}
            <Group>
              {/* Outer glow */}
              <Path
                path={masteryPath}
                style="stroke"
                strokeWidth={8}
                color={withOpacity(colors.success, 0.15)}
              />
              {/* Inner glow */}
              <Path
                path={masteryPath}
                style="stroke"
                strokeWidth={4}
                color={withOpacity(colors.success, 0.4)}
              />
              {/* Main line */}
              <Path path={masteryPath} style="stroke" strokeWidth={2.5} color={colors.success} />
            </Group>

            {/* Enhanced progress dots with animation-ready styling */}
            <Group>
              {progressDots.map((dot, index) => (
                <Group key={`mastery-dot-${index}`}>
                  {/* Outer ring */}
                  <Circle cx={dot.x} cy={dot.y} r={8} color={withOpacity(colors.success, 0.2)} />
                  {/* Middle ring */}
                  <Circle cx={dot.x} cy={dot.y} r={5} color={withOpacity(colors.success, 0.6)} />
                  {/* Inner dot */}
                  <Circle cx={dot.x} cy={dot.y} r={3} color={colors.success} />
                  {/* Center highlight */}
                  <Circle
                    cx={dot.x}
                    cy={dot.y}
                    r={1.5}
                    color={withOpacity(colors.background, 0.9)}
                  />
                </Group>
              ))}
            </Group>

            {/* Percentage markers on the right */}
            <Group>
              {[0, 25, 50, 75, 100].map(percentage => {
                const y = graphHeight - (percentage / 100) * graphHeight;
                return (
                  <Group key={`percentage-marker-${percentage}`}>
                    <Circle
                      cx={graphWidth - 4}
                      cy={y}
                      r={1}
                      color={withOpacity(colors.text, 0.3)}
                    />
                  </Group>
                );
              })}
            </Group>
          </Canvas>
        </View>

        {/* Footer */}
        <View
          style={[styles.progressFooter, { borderTopColor: withOpacity(colors.textTertiary, 0.1) }]}
        >
          <View style={styles.progressLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendArea, { backgroundColor: withOpacity(colors.success, 0.3) }]}
              />
              <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                Mastery %
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                Progress milestones
              </ThemedText>
            </View>
          </View>
          <View style={styles.timeRange}>
            <ThemedText type="caption" variant="disabled" style={styles.timeRangeText}>
              Last 14 days
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    );
  }
);

ProgressDistribution.displayName = 'ProgressDistribution';

// Retrievability Forecast Chart - Shows predicted memory retention over time
const RetrievabilityForecast = memo(
  ({ studyWords = [], onInfoPress }: { studyWords: StudyWord[]; onInfoPress: () => void }) => {
    const colors = useColors();
    const screenWidth = Dimensions.get('window').width;
    const graphWidth =
      screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
    const graphHeight = 120;

    // Calculate retrievability forecast for the next 30 days
    const forecastData = useMemo(() => {
      const today = new Date();
      const days = 30;
      const dataPoints: Array<{
        date: Date;
        avgRetrievability: number;
        criticalWords: number;
      }> = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        let totalRetrievability = 0;
        let validWords = 0;
        let criticalWords = 0;

        studyWords.forEach(word => {
          const stability = word.fsrs_stability ?? 0;
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          if (lastReview && stability > 0) {
            const daysSinceReview = (date.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

            // CORRECTED: Use proper FSRS-4.5 retrievability formula: R = (1 + t/(9*S))^(-1)
            const retrievability = Math.pow(1 + daysSinceReview / (9 * stability), -1);
            const clampedRetrievability = Math.max(0, Math.min(1, retrievability));

            totalRetrievability += clampedRetrievability;
            validWords++;

            if (clampedRetrievability < 0.7) {
              criticalWords++;
            }
          }
        });

        const avgRetrievability = validWords > 0 ? (totalRetrievability / validWords) * 100 : 0;

        dataPoints.push({
          date,
          avgRetrievability,
          criticalWords,
        });
      }

      return dataPoints;
    }, [studyWords]);

    // Calculate chart path
    const { chartPath, hasData, insights } = useMemo(() => {
      if (forecastData.length === 0) {
        return {
          chartPath: '',
          hasData: false,
          insights: { currentRetention: 0, criticalWords: 0, trend: 'stable' as const },
        };
      }

      const hasData = forecastData.some(d => d.avgRetrievability > 0);

      if (!hasData) {
        return {
          chartPath: '',
          hasData: false,
          insights: { currentRetention: 0, criticalWords: 0, trend: 'stable' as const },
        };
      }

      const stepX = graphWidth / (forecastData.length - 1);
      let chartPath = '';

      forecastData.forEach((data, index) => {
        const x = index * stepX;
        const y = graphHeight - (data.avgRetrievability / 100) * graphHeight;

        if (index === 0) {
          chartPath = `M ${x} ${y}`;
        } else {
          chartPath += ` L ${x} ${y}`;
        }
      });

      const currentRetention = forecastData[0]?.avgRetrievability || 0;
      const futureRetention = forecastData[forecastData.length - 1]?.avgRetrievability || 0;
      const criticalWords = forecastData[0]?.criticalWords || 0;
      const trend =
        futureRetention > currentRetention + 5
          ? 'improving'
          : futureRetention < currentRetention - 5
            ? 'declining'
            : 'stable';

      return {
        chartPath,
        hasData,
        insights: {
          currentRetention: Math.round(currentRetention * 10) / 10,
          criticalWords,
          trend,
        },
      };
    }, [forecastData, graphWidth, graphHeight]);

    if (!hasData) {
      return (
        <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.progressContent}>
            <View style={styles.cardHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
                Memory Retention
              </ThemedText>
              <InfoIcon onPress={onInfoPress} />
            </View>
            <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
              Review words to track memory retention
            </ThemedText>
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
              Memory Retention
            </ThemedText>
            <InfoIcon onPress={onInfoPress} />
          </View>
          <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
            {insights.currentRetention >= 80
              ? 'Excellent retention! Keep it up'
              : insights.currentRetention >= 70
                ? 'Good retention levels'
                : insights.criticalWords > 5
                  ? `${insights.criticalWords} words need review soon`
                  : 'Review more frequently for better retention'}
          </ThemedText>

          {/* Stats display */}
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStat}>
              <ThemedText
                type="heading2"
                weight="bold"
                style={[
                  styles.progressValue,
                  { color: insights.currentRetention >= 70 ? colors.success : colors.warning },
                ]}
              >
                {insights.currentRetention}%
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                retention
              </ThemedText>
            </View>
            <View style={styles.progressStat}>
              <ThemedText
                type="heading3"
                weight="bold"
                style={[
                  styles.progressValue,
                  { color: insights.criticalWords > 5 ? colors.error : colors.success },
                ]}
              >
                {insights.criticalWords}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                critical
              </ThemedText>
            </View>
          </View>

          {/* Retention Forecast Graph */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: graphWidth, height: graphHeight }}>
              {/* Background grid lines */}
              <Group>
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Path
                    key={`retention-grid-${index}`}
                    path={`M 0 ${graphHeight * ratio} L ${graphWidth} ${graphHeight * ratio}`}
                    style="stroke"
                    strokeWidth={0.5}
                    color={withOpacity(colors.text, 0.08)}
                  />
                ))}
              </Group>

              {/* Critical threshold line at 70% */}
              <Group>
                <Path
                  path={`M 0 ${graphHeight * 0.3} L ${graphWidth} ${graphHeight * 0.3}`}
                  style="stroke"
                  strokeWidth={1}
                  color={withOpacity(colors.warning, 0.6)}
                />
              </Group>

              {/* Retention area */}
              <Group>
                <Path
                  path={`${chartPath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
                  color={withOpacity(colors.info, 0.15)}
                />
              </Group>

              {/* Retention line */}
              <Group>
                <Path path={chartPath} style="stroke" strokeWidth={3} color={colors.info} />
              </Group>

              {/* Data points */}
              <Group>
                {forecastData
                  .slice(0, 30)
                  .filter((_, index) => index % 5 === 0)
                  .map((data, index) => {
                    const actualIndex = index * 5;
                    const x = (actualIndex * graphWidth) / (forecastData.length - 1);
                    const y = graphHeight - (data.avgRetrievability / 100) * graphHeight;

                    return (
                      <Group key={`retention-point-${actualIndex}`}>
                        <Circle cx={x} cy={y} r={4} color={withOpacity(colors.info, 0.3)} />
                        <Circle cx={x} cy={y} r={2} color={colors.info} />
                      </Group>
                    );
                  })}
              </Group>
            </Canvas>
          </View>

          {/* Footer */}
          <View
            style={[
              styles.progressFooter,
              { borderTopColor: withOpacity(colors.textTertiary, 0.1) },
            ]}
          >
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.info }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  Retention forecast
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.warning }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  70% threshold
                </ThemedText>
              </View>
            </View>
            <View style={styles.timeRange}>
              <ThemedText type="caption" variant="disabled" style={styles.timeRangeText}>
                Next 30 days
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

RetrievabilityForecast.displayName = 'RetrievabilityForecast';

// Difficulty Distribution Chart - Shows distribution of word difficulties
const DifficultyDistribution = memo(
  ({ studyWords = [], onInfoPress }: { studyWords: StudyWord[]; onInfoPress: () => void }) => {
    const colors = useColors();
    const screenWidth = Dimensions.get('window').width;
    const graphWidth =
      screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
    const graphHeight = 120;

    // Calculate difficulty distribution
    const distributionData = useMemo(() => {
      if (studyWords.length === 0) {
        return {
          hasData: false,
          buckets: [],
          insights: { averageDifficulty: 0, hardWords: 0, easyWords: 0 },
        };
      }

      // CORRECTED: Create 5 difficulty buckets with proper boundaries
      // FSRS difficulty ranges from 0-1, we scale to 1-10 for better visualization
      const buckets = [
        { label: 'Very Easy', min: 1, max: 3, count: 0, color: colors.success },
        { label: 'Easy', min: 3, max: 5, count: 0, color: withOpacity(colors.success, 0.7) },
        { label: 'Medium', min: 5, max: 7, count: 0, color: colors.info },
        { label: 'Hard', min: 7, max: 9, count: 0, color: colors.warning },
        { label: 'Very Hard', min: 9, max: 10, count: 0, color: colors.error },
      ];

      let totalDifficulty = 0;
      let validWords = 0;

      studyWords.forEach(word => {
        const rawDifficulty = word.fsrs_difficulty ?? 0.3;
        // CORRECTED: Clamp to valid range and scale properly
        const clampedDifficulty = Math.max(0, Math.min(1, rawDifficulty));
        const difficulty = clampedDifficulty * 9 + 1; // Scale 0-1 to 1-10

        totalDifficulty += difficulty;
        validWords++;

        // CORRECTED: Find the appropriate bucket using proper boundary logic
        for (let i = 0; i < buckets.length; i++) {
          const bucket = buckets[i];
          if (!bucket) continue; // Safety check

          // Use inclusive lower bound and exclusive upper bound, except for the last bucket
          if (i === buckets.length - 1) {
            // Last bucket includes the upper bound
            if (difficulty >= bucket.min && difficulty <= bucket.max) {
              bucket.count++;
              break;
            }
          } else {
            // Other buckets exclude the upper bound
            if (difficulty >= bucket.min && difficulty < bucket.max) {
              bucket.count++;
              break;
            }
          }
        }
      });

      const averageDifficulty = validWords > 0 ? totalDifficulty / validWords : 0;
      const hardWords = (buckets[3]?.count || 0) + (buckets[4]?.count || 0);
      const easyWords = (buckets[0]?.count || 0) + (buckets[1]?.count || 0);

      return {
        hasData: validWords > 0,
        buckets,
        insights: {
          averageDifficulty: Math.round(averageDifficulty * 10) / 10,
          hardWords,
          easyWords,
        },
      };
    }, [studyWords, colors]);

    if (!distributionData.hasData) {
      return (
        <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.progressContent}>
            <View style={styles.cardHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
                Difficulty Balance
              </ThemedText>
              <InfoIcon onPress={onInfoPress} />
            </View>
            <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
              Review words to analyze difficulty patterns
            </ThemedText>
          </View>
        </BaseCard>
      );
    }

    const maxCount = Math.max(...distributionData.buckets.map(b => b.count), 1);

    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
              Difficulty Balance
            </ThemedText>
            <InfoIcon onPress={onInfoPress} />
          </View>
          <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
            {distributionData.insights.averageDifficulty <= 4
              ? 'Good balance - mostly easy words'
              : distributionData.insights.averageDifficulty <= 6
                ? 'Moderate challenge level'
                : distributionData.insights.hardWords > distributionData.insights.easyWords
                  ? 'Many challenging words - consider reviewing more'
                  : 'Balanced difficulty distribution'}
          </ThemedText>

          {/* Stats display */}
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStat}>
              <ThemedText
                type="heading2"
                weight="bold"
                style={[
                  styles.progressValue,
                  {
                    color:
                      distributionData.insights.averageDifficulty <= 5
                        ? colors.success
                        : distributionData.insights.averageDifficulty <= 7
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              >
                {distributionData.insights.averageDifficulty}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                avg difficulty
              </ThemedText>
            </View>
            <View style={styles.progressStat}>
              <ThemedText
                type="heading3"
                weight="bold"
                style={[
                  styles.progressValue,
                  {
                    color: distributionData.insights.hardWords > 10 ? colors.error : colors.success,
                  },
                ]}
              >
                {distributionData.insights.hardWords}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                challenging
              </ThemedText>
            </View>
          </View>

          {/* Difficulty Distribution Chart */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: graphWidth, height: graphHeight }}>
              {/* Background grid lines */}
              <Group>
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Path
                    key={`difficulty-grid-${index}`}
                    path={`M 0 ${graphHeight * ratio} L ${graphWidth} ${graphHeight * ratio}`}
                    style="stroke"
                    strokeWidth={0.5}
                    color={withOpacity(colors.text, 0.08)}
                  />
                ))}
              </Group>

              {/* Difficulty bars */}
              <Group>
                {distributionData.buckets.map((bucket, index) => {
                  const barWidth = (graphWidth / distributionData.buckets.length) * 0.8;
                  const barSpacing = graphWidth / distributionData.buckets.length;
                  const x = index * barSpacing + (barSpacing - barWidth) / 2;
                  const barHeight = (bucket.count / maxCount) * graphHeight * 0.8;
                  const y = graphHeight - barHeight;

                  return (
                    <Group key={`difficulty-bar-${index}`}>
                      {/* Bar shadow */}
                      <Rect
                        x={x + 1}
                        y={y + 1}
                        width={barWidth}
                        height={barHeight}
                        color={withOpacity(colors.text, 0.1)}
                      />
                      {/* Main bar */}
                      <Rect x={x} y={y} width={barWidth} height={barHeight} color={bucket.color} />
                      {/* Bar highlight */}
                      <Rect
                        x={x}
                        y={y}
                        width={barWidth * 0.3}
                        height={barHeight}
                        color={withOpacity(colors.background, 0.3)}
                      />
                    </Group>
                  );
                })}
              </Group>
            </Canvas>
          </View>

          {/* Footer */}
          <View
            style={[
              styles.progressFooter,
              { borderTopColor: withOpacity(colors.textTertiary, 0.1) },
            ]}
          >
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBar, { backgroundColor: colors.success }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  Easy
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBar, { backgroundColor: colors.warning }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  Hard
                </ThemedText>
              </View>
            </View>
            <View style={styles.timeRange}>
              <ThemedText type="caption" variant="disabled" style={styles.timeRangeText}>
                1-10 scale
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

DifficultyDistribution.displayName = 'DifficultyDistribution';

// Learning Efficiency Chart - Shows how effectively study time translates to progress
const LearningEfficiency = memo(
  ({ studyWords = [], onInfoPress }: { studyWords: StudyWord[]; onInfoPress: () => void }) => {
    const colors = useColors();
    const screenWidth = Dimensions.get('window').width;
    const graphWidth =
      screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2 - LAYOUT.CARD.PADDING.MEDIUM * 2;
    const graphHeight = 120;

    // Calculate learning efficiency over the last 14 days
    const efficiencyData = useMemo(() => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const days = 14;
      const dataPoints: Array<{
        date: Date;
        efficiency: number;
        totalReviews: number;
      }> = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(23, 59, 59, 999);

        let totalReviews = 0;
        let efficientReviews = 0;

        studyWords.forEach(word => {
          const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

          if (lastReview && lastReview.toDateString() === date.toDateString()) {
            totalReviews++;

            // CORRECTED: Better efficiency calculation based on FSRS principles
            // A review is considered efficient if it results in meaningful learning progress
            const stability = word.fsrs_stability ?? 0;
            const difficulty = word.fsrs_difficulty ?? 0.3;
            const state = word.fsrs_state ?? 0;
            const reps = word.fsrs_reps ?? 0;
            const lapses = word.fsrs_lapses ?? 0;

            // Multi-factor efficiency scoring (0-100)
            let efficiencyScore = 0;

            // Factor 1: State Progression (40% weight) - Did the word advance in learning?
            if (state === 2)
              efficiencyScore += 40; // Review state = mastered
            else if (state === 1 && reps > 1)
              efficiencyScore += 30; // Learning with progress
            else if (state === 0 && reps === 1)
              efficiencyScore += 20; // First review
            else if (state === 3) efficiencyScore += 10; // Relearning (some progress)

            // Factor 2: Stability Quality (30% weight) - Higher stability = better retention
            if (stability >= 30) efficiencyScore += 30;
            else if (stability >= 14) efficiencyScore += 25;
            else if (stability >= 7) efficiencyScore += 20;
            else if (stability >= 3) efficiencyScore += 15;
            else if (stability >= 1) efficiencyScore += 10;

            // Factor 3: Lapse Rate (20% weight) - Lower lapses = more efficient learning
            if (lapses === 0) efficiencyScore += 20;
            else if (lapses === 1) efficiencyScore += 15;
            else if (lapses === 2) efficiencyScore += 10;
            else if (lapses <= 4) efficiencyScore += 5;

            // Factor 4: Difficulty Balance (10% weight) - Optimal difficulty range
            if (difficulty >= 0.3 && difficulty <= 0.6) efficiencyScore += 10;
            else if (difficulty >= 0.2 && difficulty <= 0.7) efficiencyScore += 7;
            else if (difficulty >= 0.1 && difficulty <= 0.8) efficiencyScore += 5;

            // A review is efficient if it scores >= 70%
            if (efficiencyScore >= 70) {
              efficientReviews++;
            }
          }
        });

        const efficiency = totalReviews > 0 ? (efficientReviews / totalReviews) * 100 : 0;

        dataPoints.push({
          date,
          efficiency,
          totalReviews,
        });
      }

      return dataPoints;
    }, [studyWords]);

    // Calculate chart path and insights
    const { chartPath, hasData, insights } = useMemo(() => {
      if (efficiencyData.length === 0) {
        return {
          chartPath: '',
          hasData: false,
          insights: { currentEfficiency: 0, totalReviews: 0, trend: 'stable' as const },
        };
      }

      const hasData = efficiencyData.some(d => d.totalReviews > 0);

      if (!hasData) {
        return {
          chartPath: '',
          hasData: false,
          insights: { currentEfficiency: 0, totalReviews: 0, trend: 'stable' as const },
        };
      }

      const stepX = graphWidth / (efficiencyData.length - 1);
      let chartPath = '';

      efficiencyData.forEach((data, index) => {
        const x = index * stepX;
        const y = graphHeight - (data.efficiency / 100) * graphHeight;

        if (index === 0) {
          chartPath = `M ${x} ${y}`;
        } else {
          chartPath += ` L ${x} ${y}`;
        }
      });

      const recentData = efficiencyData.slice(-7);
      const currentEfficiency =
        recentData.reduce((sum, d) => sum + d.efficiency, 0) / recentData.length;
      const totalReviews = efficiencyData.reduce((sum, d) => sum + d.totalReviews, 0);

      const olderData = efficiencyData.slice(0, 7);
      const olderEfficiency =
        olderData.reduce((sum, d) => sum + d.efficiency, 0) / olderData.length;

      const trend =
        currentEfficiency > olderEfficiency + 10
          ? 'improving'
          : currentEfficiency < olderEfficiency - 10
            ? 'declining'
            : 'stable';

      return {
        chartPath,
        hasData,
        insights: {
          currentEfficiency: Math.round(currentEfficiency * 10) / 10,
          totalReviews,
          trend,
        },
      };
    }, [efficiencyData, graphWidth, graphHeight]);

    if (!hasData) {
      return (
        <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
          <View style={styles.progressContent}>
            <View style={styles.cardHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
                Learning Efficiency
              </ThemedText>
              <InfoIcon onPress={onInfoPress} />
            </View>
            <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
              Complete reviews to track learning efficiency
            </ThemedText>
          </View>
        </BaseCard>
      );
    }

    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          <View style={styles.cardHeader}>
            <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
              Learning Efficiency
            </ThemedText>
            <InfoIcon onPress={onInfoPress} />
          </View>
          <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
            {insights.currentEfficiency >= 80
              ? 'Excellent learning efficiency!'
              : insights.currentEfficiency >= 70
                ? 'Good efficiency - keep it up'
                : insights.currentEfficiency >= 50
                  ? 'Moderate efficiency - room for improvement'
                  : 'Focus on quality over quantity in reviews'}
          </ThemedText>

          {/* Stats display */}
          <View style={styles.progressStatsRow}>
            <View style={styles.progressStat}>
              <ThemedText
                type="heading2"
                weight="bold"
                style={[
                  styles.progressValue,
                  {
                    color:
                      insights.currentEfficiency >= 70
                        ? colors.success
                        : insights.currentEfficiency >= 50
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              >
                {insights.currentEfficiency}%
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                efficiency
              </ThemedText>
            </View>
            <View style={styles.progressStat}>
              <ThemedText type="heading3" weight="bold" style={styles.progressValue}>
                {insights.totalReviews}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.progressLabel}>
                reviews
              </ThemedText>
            </View>
          </View>

          {/* Efficiency Graph */}
          <View style={styles.graphContainer}>
            <Canvas style={{ width: graphWidth, height: graphHeight }}>
              {/* Background grid lines */}
              <Group>
                {[0.25, 0.5, 0.75].map((ratio, index) => (
                  <Path
                    key={`efficiency-grid-${index}`}
                    path={`M 0 ${graphHeight * ratio} L ${graphWidth} ${graphHeight * ratio}`}
                    style="stroke"
                    strokeWidth={0.5}
                    color={withOpacity(colors.text, 0.08)}
                  />
                ))}
              </Group>

              {/* Efficiency area */}
              <Group>
                <Path
                  path={`${chartPath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
                  color={withOpacity(colors.tint, 0.15)}
                />
              </Group>

              {/* Efficiency line */}
              <Group>
                <Path path={chartPath} style="stroke" strokeWidth={3} color={colors.tint} />
              </Group>

              {/* 70% efficiency threshold line */}
              <Group>
                <Path
                  path={`M 0 ${graphHeight * 0.3} L ${graphWidth} ${graphHeight * 0.3}`}
                  style="stroke"
                  strokeWidth={1}
                  color={withOpacity(colors.success, 0.6)}
                />
              </Group>

              {/* Data points */}
              <Group>
                {efficiencyData
                  .filter(d => d.totalReviews > 0)
                  .map((data, index) => {
                    const actualIndex = efficiencyData.findIndex(d => d.date === data.date);
                    const x = (actualIndex * graphWidth) / (efficiencyData.length - 1);
                    const y = graphHeight - (data.efficiency / 100) * graphHeight;

                    return (
                      <Group key={`efficiency-point-${actualIndex}`}>
                        <Circle cx={x} cy={y} r={4} color={withOpacity(colors.tint, 0.3)} />
                        <Circle cx={x} cy={y} r={2} color={colors.tint} />
                      </Group>
                    );
                  })}
              </Group>
            </Canvas>
          </View>

          {/* Footer */}
          <View
            style={[
              styles.progressFooter,
              { borderTopColor: withOpacity(colors.textTertiary, 0.1) },
            ]}
          >
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.tint }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  Efficiency %
                </ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.success }]} />
                <ThemedText type="caption" variant="secondary" style={styles.legendText}>
                  70% target
                </ThemedText>
              </View>
            </View>
            <View style={styles.timeRange}>
              <ThemedText type="caption" variant="disabled" style={styles.timeRangeText}>
                Last 14 days
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

LearningEfficiency.displayName = 'LearningEfficiency';

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStatPress,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();

    // Modal state for info dialogs
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<InfoModalType | null>(null);

    // Handle info icon presses
    const handleInfoPress = (type: InfoModalType) => {
      lightFeedback();
      setModalType(type);
      setModalVisible(true);
    };

    const handleCloseModal = () => {
      setModalVisible(false);
      setModalType(null);
    };

    // Validate input data to prevent inconsistencies
    const validatedInput = useMemo(() => {
      const validStudyWords = Array.isArray(studyWords) ? studyWords.filter(Boolean) : [];
      return {
        masteredWords: Math.max(0, masteredWords),
        learningWords: Math.max(0, learningWords),
        dueWords: Math.max(0, dueWords),
        studyWords: validStudyWords,
      };
    }, [masteredWords, learningWords, dueWords, studyWords]);

    // Calculate FSRS-based metrics from study words
    const fsrsMetrics = useMemo(() => {
      if (!validatedInput.studyWords.length) {
        return {
          totalWords: 0,
          needsAttention: 0,
          newWords: 0,
        };
      }

      let needsAttention = 0;
      let newWords = 0;

      validatedInput.studyWords.forEach(word => {
        // Words that need attention:
        // 1. High difficulty (>0.6) with lapses
        // 2. In learning/relearning with multiple lapses (>1)
        // 3. Low stability (<7 days) with high difficulty (>0.5)
        const difficulty = word.fsrs_difficulty ?? 0.3;
        const lapses = word.fsrs_lapses ?? 0;
        const stability = word.fsrs_stability ?? 0;
        const state = word.fsrs_state;

        const isHighDifficultyWithLapses = difficulty > 0.6 && lapses > 0;
        const isStrugglingInLearning = (state === 1 || state === 2) && lapses > 1;
        const isUnstableAndDifficult = stability < 7 && difficulty > 0.5 && lapses > 0;

        if (isHighDifficultyWithLapses || isStrugglingInLearning || isUnstableAndDifficult) {
          needsAttention++;
        }

        // New words: Never reviewed
        if (!word.fsrs_last_review) {
          newWords++;
        }
      });

      return {
        totalWords: validatedInput.studyWords.length,
        needsAttention,
        newWords,
      };
    }, [validatedInput.studyWords]);

    // Calculate validated data with proper consistency checks
    const validatedData = useMemo(() => {
      const total = Math.max(fsrsMetrics.totalWords, 1);

      // Ensure data consistency - words can't exceed total
      const validMastered = Math.min(validatedInput.masteredWords, total);
      const validLearning = Math.min(validatedInput.learningWords, total);
      const validDue = Math.min(validatedInput.dueWords, total);

      return {
        total,
        mastered: validMastered,
        learning: validLearning,
        due: validDue,
        needsAttention: fsrsMetrics.needsAttention,
        newWords: fsrsMetrics.newWords,
      };
    }, [fsrsMetrics, validatedInput]);

    // Prepare stat cards with improved visual design and logical ordering
    const statCards: StatCardProps[] = useMemo(
      () => [
        // Primary action - most important
        {
          value: validatedData.due,
          label: 'Due',
          icon: 'alarm-outline',
          iconColor: colors.warning,
          bgColor: withOpacity(colors.warning, 0.19),
          borderColor: colors.warning + '40',
          category: 'due',
        },
        // Secondary actions - learning progress
        {
          value: validatedData.learning,
          label: 'Learning',
          icon: 'school-outline',
          iconColor: colors.info,
          bgColor: withOpacity(colors.info, 0.19),
          borderColor: colors.info + '40',
          category: 'learning',
        },
        {
          value: validatedData.mastered,
          label: 'Mastered',
          icon: 'checkmark-circle-outline',
          iconColor: colors.success,
          bgColor: withOpacity(colors.success, 0.19),
          borderColor: colors.success + '40',
          category: 'mastered',
        },
        // FSRS insight - challenging words that need attention
        {
          value: validatedData.needsAttention,
          label: 'Difficult',
          icon: 'alert-circle',
          iconColor: colors.error,
          bgColor: withOpacity(colors.error, 0.19),
          borderColor: colors.error + '40',
          category: 'needsAttention',
        },
      ],
      [validatedData, colors]
    );

    return (
      <View style={styles.container}>
        {/* Learning Gauge - Primary guidance */}
        <LearningGauge
          dueWords={validatedData.due}
          learningWords={validatedData.learning}
          totalWords={validatedData.total}
          masteredWords={validatedData.mastered}
        />

        {/* Stat Cards - Detailed breakdown */}
        <View style={styles.statsGrid}>
          {statCards.map(card => (
            <StatCard
              key={`vocab-stat-card-${card.category}`}
              value={card.value}
              label={card.label}
              icon={card.icon}
              iconColor={card.iconColor}
              bgColor={card.bgColor}
              borderColor={card.borderColor}
              category={card.category}
              onPress={onStatPress}
            />
          ))}
        </View>

        {/* Streak Insights */}
        <StreakInsights onInfoPress={() => handleInfoPress('streak')} />

        {/* Progress Graph */}
        <ProgressGraph
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('activity')}
        />

        {/* Progress Distribution */}
        <ProgressDistribution
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('mastery')}
        />

        {/* Retrievability Forecast */}
        <RetrievabilityForecast
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('retrievability')}
        />

        {/* Difficulty Distribution */}
        <DifficultyDistribution
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('difficulty')}
        />

        {/* Learning Efficiency */}
        <LearningEfficiency
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('efficiency')}
        />

        {/* Info Modal */}
        <InfoModal visible={modalVisible} type={modalType} onClose={handleCloseModal} />
      </View>
    );
  }
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.XLARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'space-between',
    marginTop: -LAYOUT.SPACING.SMALL,
  },
  statCard: {
    width: '48%',
    minWidth: 150,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    minHeight: 72,
  },
  iconContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
    borderWidth: 1,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCenter: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contentRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  statValue: {
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  statLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
  },
  navigationIcon: {
    opacity: 0.5,
  },
  streakCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  streakContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  cardTitle: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
  },
  cardSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  activitySection: {
    paddingTop: LAYOUT.SPACING.LARGE,
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  activityDot: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  dayLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textAlign: 'center',
  },
  progressCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressValue: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
  },
  progressLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  graphContainer: {
    height: 100,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  progressLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.LARGE,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 0,
  },
  legendArea: {
    width: 16,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  timeRange: {
    alignItems: 'center',
  },
  timeRangeText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  legendBar: {
    width: 16,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginRight: LAYOUT.SPACING.XSMALL,
  },
  infoIcon: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
