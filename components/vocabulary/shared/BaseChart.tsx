import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import BaseCard from '../../BaseCard';
import { ThemedText } from '../../ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

import { CardHeader } from './CardHeader';
import { StatsRow } from './StatsRow';
import { ChartFooter } from './ChartFooter';
import { CHART_LAYOUT } from './constants';

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
    contentHeight = 180, // Updated to match increased graph height
    emptyStateText = 'Study words to see your progress',
    errorText = 'Unable to load chart data',
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
            <View style={styles.headerSection}>
              <CardHeader title={title} subtitle={subtitle} onInfoPress={onInfoPress} />
            </View>
          )}

          {/* Stats Section */}
          {leftStat && rightStat && (
            <View
              style={[
                styles.statsSection,
                // Better visual separation when no header
                !hideTitle ? {} : { marginTop: CHART_LAYOUT.ELEMENT_SPACING / 2 },
              ]}
            >
              <StatsRow leftStat={leftStat} rightStat={rightStat} />
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={[styles.loadingState, { height: contentHeight }]}>
              <ActivityIndicator size="small" color={colors.tint} style={styles.loadingIndicator} />
              <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>
                Loading chart...
              </ThemedText>
            </View>
          )}

          {/* Chart Content */}
          {!isLoading && <View style={styles.chartSection}>{children}</View>}

          {/* Footer Section */}
          {legendItems && timeRange && !isLoading && (
            <View style={styles.footerSection}>
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
  headerSection: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING, // 16px - good separation from title
  },
  statsSection: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING * 0.75, // Reduced from 1.25x to 0.75x (12px)
    paddingHorizontal: CHART_LAYOUT.ELEMENT_SPACING * 0.25, // Gentle horizontal grouping
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING * 0.25, // Reduced vertical padding (4px)
  },
  chartSection: {
    position: 'relative',
    // Tighter spacing for better stats-chart proximity
    marginVertical: CHART_LAYOUT.ELEMENT_SPACING * 0.5, // Reduced from 0.75x to 0.5x (8px)
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING * 0.25, // Reduced internal padding (4px)
  },
  footerSection: {
    marginTop: CHART_LAYOUT.ELEMENT_SPACING * 0.75, // Slightly reduced (12px)
    paddingTop: CHART_LAYOUT.ELEMENT_SPACING * 0.25,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CHART_LAYOUT.ELEMENT_SPACING * 1.5,
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING,
  },
  loadingState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CHART_LAYOUT.ELEMENT_SPACING * 1.5,
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING,
  },
  loadingIndicator: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
    opacity: 0.75,
  },
  loadingText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.15,
    opacity: 0.65,
  },
});
