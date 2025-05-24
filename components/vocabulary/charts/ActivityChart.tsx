import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Circle, Group } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../../BaseCard';
import { CardHeader } from '../shared/CardHeader';
import { ChartFooter } from '../shared/ChartFooter';
import { GRAPH_WIDTH, GRAPH_HEIGHT_SMALL, DAYS_14 } from '../shared/constants';
import { StatsRow } from '../shared/StatsRow';
import { generateDateRange, isSameDay } from '../shared/utils';

interface ActivityChartProps {
  studyWords: StudyWord[];
  onInfoPress: () => void;
}

export const ActivityChart = memo(({ studyWords = [], onInfoPress }: ActivityChartProps) => {
  const colors = useColors();

  // Calculate progress data over the last 14 days
  const progressData = useMemo(() => {
    const dates = generateDateRange(DAYS_14);

    return dates.map(date => {
      let newWords = 0;
      let reviewsToday = 0;

      studyWords.forEach(word => {
        const createdAt = new Date(word.created_at);
        const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

        // Count words added on this specific day
        if (isSameDay(createdAt, date)) {
          newWords++;
        }

        // Count reviews done on this specific day
        if (lastReview && isSameDay(lastReview, date) && (word.fsrs_reps ?? 0) > 0) {
          reviewsToday++;
        }
      });

      return { date, newWords, reviewsToday };
    });
  }, [studyWords]);

  // Calculate chart paths and insights
  const chartData = useMemo(() => {
    if (progressData.length === 0) {
      return { reviewPath: '', hasData: false, insights: { dailyAverage: 0, weeklyTotal: 0 } };
    }

    const hasData = progressData.some(d => d.newWords > 0 || d.reviewsToday > 0);

    if (!hasData) {
      return { reviewPath: '', hasData: false, insights: { dailyAverage: 0, weeklyTotal: 0 } };
    }

    const maxActivity = Math.max(1, Math.max(...progressData.map(d => d.newWords)));
    const maxReviews = Math.max(1, Math.max(...progressData.map(d => d.reviewsToday)));
    const maxValue = Math.max(maxActivity, maxReviews);

    const stepX = GRAPH_WIDTH / (progressData.length - 1);
    let reviewPath = '';

    progressData.forEach((data, index) => {
      const x = index * stepX;
      const reviewY = GRAPH_HEIGHT_SMALL - (data.reviewsToday / maxValue) * GRAPH_HEIGHT_SMALL;

      if (index === 0) {
        reviewPath = `M ${x} ${reviewY}`;
      } else {
        reviewPath += ` L ${x} ${reviewY}`;
      }
    });

    // Calculate insights
    const recentDays = progressData.slice(-7);
    const totalNewWords = recentDays.reduce((sum, day) => sum + day.newWords, 0);
    const totalReviews = recentDays.reduce((sum, day) => sum + day.reviewsToday, 0);
    const dailyAverage = Math.round(((totalNewWords + totalReviews) / 7) * 10) / 10;

    return {
      reviewPath,
      hasData,
      maxValue,
      insights: {
        dailyAverage,
        weeklyTotal: totalNewWords + totalReviews,
      },
    };
  }, [progressData]);

  // Generate subtitle based on activity
  const subtitle = useMemo(() => {
    const { weeklyTotal, dailyAverage } = chartData.insights;

    if (weeklyTotal === 0) {
      return 'No activity this week';
    }
    if (dailyAverage >= 3) {
      return 'Great momentum this week!';
    }
    if (weeklyTotal >= 5) {
      return 'Good progress this week';
    }
    return 'Try to be more active';
  }, [chartData.insights]);

  if (!chartData.hasData) {
    return (
      <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.progressContent}>
          <CardHeader
            title="Activity"
            subtitle="Daily learning patterns over 14 days"
            onInfoPress={onInfoPress}
          />
        </View>
      </BaseCard>
    );
  }

  return (
    <BaseCard style={styles.progressCard} shadowSize="small" includePressAnimation={false}>
      <View style={styles.progressContent}>
        <CardHeader title="Activity" subtitle={subtitle} onInfoPress={onInfoPress} />

        <StatsRow
          leftStat={{
            value: chartData.insights.dailyAverage,
            label: 'daily avg',
          }}
          rightStat={{
            value: chartData.insights.weeklyTotal,
            label: 'this week',
            color: colors.tint,
          }}
        />

        {/* Activity Graph */}
        <View style={styles.graphContainer}>
          <Canvas style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT_SMALL }}>
            {/* Background grid lines */}
            <Group>
              {[0.25, 0.5, 0.75].map((ratio, index) => (
                <Path
                  key={`grid-line-${index}`}
                  path={`M 0 ${GRAPH_HEIGHT_SMALL * ratio} L ${GRAPH_WIDTH} ${GRAPH_HEIGHT_SMALL * ratio}`}
                  style="stroke"
                  strokeWidth={0.5}
                  color={withOpacity(colors.text, 0.1)}
                />
              ))}
            </Group>

            {/* Activity bars */}
            <Group>
              {progressData.map((data, index) => {
                const x = (index * GRAPH_WIDTH) / (progressData.length - 1);
                const barHeight = (data.newWords / chartData.maxValue!) * GRAPH_HEIGHT_SMALL;
                const barWidth = Math.max(2, (GRAPH_WIDTH / progressData.length) * 0.6);

                if (barHeight > 0) {
                  return (
                    <Group key={`activity-bar-${index}`}>
                      {/* Bar shadow */}
                      <Path
                        path={`M ${x - barWidth / 2 + 1} ${GRAPH_HEIGHT_SMALL + 1} L ${x - barWidth / 2 + 1} ${GRAPH_HEIGHT_SMALL - barHeight + 1} L ${x + barWidth / 2 + 1} ${GRAPH_HEIGHT_SMALL - barHeight + 1} L ${x + barWidth / 2 + 1} ${GRAPH_HEIGHT_SMALL + 1} Z`}
                        color={withOpacity(colors.text, 0.1)}
                      />
                      {/* Main bar */}
                      <Path
                        path={`M ${x - barWidth / 2} ${GRAPH_HEIGHT_SMALL} L ${x - barWidth / 2} ${GRAPH_HEIGHT_SMALL - barHeight} L ${x + barWidth / 2} ${GRAPH_HEIGHT_SMALL - barHeight} L ${x + barWidth / 2} ${GRAPH_HEIGHT_SMALL} Z`}
                        color={colors.info}
                      />
                      {/* Bar highlight */}
                      <Path
                        path={`M ${x - barWidth / 2} ${GRAPH_HEIGHT_SMALL - barHeight} L ${x - barWidth / 2 + 2} ${GRAPH_HEIGHT_SMALL - barHeight} L ${x - barWidth / 2 + 2} ${GRAPH_HEIGHT_SMALL} L ${x - barWidth / 2} ${GRAPH_HEIGHT_SMALL} Z`}
                        color={withOpacity(colors.background, 0.3)}
                      />
                    </Group>
                  );
                }
                return null;
              })}
            </Group>

            {/* Review line with glow effect */}
            <Group>
              <Path
                path={chartData.reviewPath}
                style="stroke"
                strokeWidth={6}
                color={withOpacity(colors.success, 0.2)}
              />
              <Path
                path={chartData.reviewPath}
                style="stroke"
                strokeWidth={3}
                color={colors.success}
              />
            </Group>

            {/* Review points */}
            <Group>
              {progressData.map((data, index) => {
                if (data.reviewsToday > 0) {
                  const x = (index * GRAPH_WIDTH) / (progressData.length - 1);
                  const y =
                    GRAPH_HEIGHT_SMALL -
                    (data.reviewsToday / chartData.maxValue!) * GRAPH_HEIGHT_SMALL;
                  return (
                    <Group key={`review-point-${index}`}>
                      <Circle cx={x} cy={y} r={6} color={withOpacity(colors.success, 0.3)} />
                      <Circle cx={x} cy={y} r={4} color={colors.success} />
                      <Circle cx={x} cy={y} r={2} color={withOpacity(colors.background, 0.8)} />
                    </Group>
                  );
                }
                return null;
              })}
            </Group>
          </Canvas>
        </View>

        <ChartFooter
          legendItems={[
            { type: 'bar', color: colors.info, label: 'New words' },
            { type: 'line', color: colors.success, label: 'Reviews' },
          ]}
          timeRange="Last 14 days"
        />
      </View>
    </BaseCard>
  );
});

ActivityChart.displayName = 'ActivityChart';

const styles = StyleSheet.create({
  progressCard: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  graphContainer: {
    height: 100,
    marginBottom: LAYOUT.SPACING.LARGE,
    marginHorizontal: -LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
});
