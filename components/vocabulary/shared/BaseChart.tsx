import React, { memo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '../../BaseCard';
import { ThemedText } from '../../ThemedText';
import { CardHeader } from './CardHeader';
import { StatsRow } from './StatsRow';
import { ChartFooter } from './ChartFooter';
import { CHART_LAYOUT } from './constants';
import { useColors } from '@/hooks/useColors';
import type { StatCategory } from '@/types/vocabulary.types';

export interface LegendItemProps {
  type: 'bar' | 'line' | 'area' | 'dot';
  color: string;
  label: string;
}

interface StatItemProps {
  value: string | number;
  label: string;
  color?: string;
  onPress?: () => void;
}

interface BaseChartProps {
  // Header props
  title: string;
  subtitle: string;
  onInfoPress: () => void;
  hideTitle?: boolean;

  // Content props
  children: ReactNode;
  hasData: boolean;
  isLoading?: boolean;
  error?: Error | null;

  // Stats props (optional)
  leftStat?: StatItemProps;
  rightStat?: StatItemProps;

  // Footer props (optional)
  legendItems?: LegendItemProps[];
  timeRange?: string;

  // Layout props
  contentHeight?: number;
  emptyStateText?: string;
  errorText?: string;

  // Animation props
  enableAnimation?: boolean;
  animationDelay?: number;
}

/**
 * Base chart component that provides consistent structure, animations,
 * and state handling across all vocabulary charts.
 */
export const BaseChart = memo(
  ({
    title,
    subtitle,
    onInfoPress,
    hideTitle = false,
    children,
    hasData,
    isLoading = false,
    error = null,
    leftStat,
    rightStat,
    legendItems,
    timeRange,
    contentHeight = 140, // Default chart height
    emptyStateText = 'Study words to see your progress',
    errorText = 'Unable to load chart data',
    enableAnimation = false,
    animationDelay = 0,
  }: BaseChartProps) => {
    const colors = useColors();

    // Error state
    if (error) {
      return (
        <BaseCard shadowSize="small" includePressAnimation={false}>
          <View style={styles.content}>
            {!hideTitle && (
              <CardHeader title={title} subtitle="Error loading data" onInfoPress={onInfoPress} />
            )}
            <View style={[styles.emptyState, { height: contentHeight + 40 }]}>
              <ThemedText style={[styles.emptyText, { color: colors.error }]}>
                {errorText}
              </ThemedText>
            </View>
          </View>
        </BaseCard>
      );
    }

    // Empty state
    if (!hasData && !isLoading) {
      return (
        <BaseCard shadowSize="small" includePressAnimation={false}>
          <View style={styles.content}>
            {!hideTitle && (
              <CardHeader title={title} subtitle={subtitle} onInfoPress={onInfoPress} />
            )}
            <View style={[styles.emptyState, { height: contentHeight + 40 }]}>
              <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
                {emptyStateText}
              </ThemedText>
            </View>
          </View>
        </BaseCard>
      );
    }

    // Main chart with data
    return (
      <BaseCard shadowSize="small" includePressAnimation={false}>
        <View style={styles.content}>
          {/* Header Section */}
          {!hideTitle && (
            <View>
              <CardHeader title={title} subtitle={subtitle} onInfoPress={onInfoPress} />
            </View>
          )}

          {/* Stats Section */}
          {leftStat && rightStat && (
            <View style={styles.statsSection}>
              <StatsRow leftStat={leftStat} rightStat={rightStat} />
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={[styles.loadingState, { height: contentHeight }]}>
              <ThemedText style={[styles.emptyText, { color: colors.secondaryText }]}>
                Loading...
              </ThemedText>
            </View>
          )}

          {/* Chart Content */}
          {!isLoading && <View style={styles.chartSection}>{children}</View>}

          {/* Footer Section */}
          {legendItems && timeRange && !isLoading && (
            <View>
              <ChartFooter legendItems={legendItems} timeRange={timeRange} />
            </View>
          )}
        </View>
      </BaseCard>
    );
  }
);

BaseChart.displayName = 'BaseChart';

const styles = StyleSheet.create({
  content: {
    padding: CHART_LAYOUT.CONTENT_PADDING,
  },
  statsSection: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
  },
  chartSection: {
    position: 'relative',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
