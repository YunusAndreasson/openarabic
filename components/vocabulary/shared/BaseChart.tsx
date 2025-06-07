import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';

import BaseCard from '../../BaseCard';
import { ThemedText } from '../../ThemedText';

import { CardHeader } from './CardHeader';
import { ChartFooter } from './ChartFooter';
import { CHART_LAYOUT } from './constants';

export interface LegendItemProps {
  type: 'area' | 'bar' | 'dot' | 'line';
  color: string;
  label: string;
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
    legendItems,
    timeRange,
    contentHeight = 176, // Optimized to match GRAPH_HEIGHT_LARGE
    emptyStateText = 'Study words to see your progress',
    errorText = 'Unable to load chart data',
  }: BaseChartProps) => {
    const colors = useColors();

    // Error state
    if (error) {
      return (
        <BaseCard includePressAnimation={false} shadowSize="small">
          <View style={styles.content}>
            {!hideTitle && (
              <CardHeader subtitle="Error loading data" title={title} onInfoPress={onInfoPress} />
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
        <BaseCard includePressAnimation={false} shadowSize="small">
          <View style={styles.content}>
            {!hideTitle && (
              <CardHeader subtitle={subtitle} title={title} onInfoPress={onInfoPress} />
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
      <BaseCard includePressAnimation={false} shadowSize="small">
        <View style={styles.content}>
          {/* Header Section */}
          {!hideTitle && (
            <View style={styles.headerSection}>
              <CardHeader subtitle={subtitle} title={title} onInfoPress={onInfoPress} />
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={[styles.loadingState, { height: contentHeight }]}>
              <ActivityIndicator color={colors.tint} size="small" style={styles.loadingIndicator} />
              <ThemedText style={[styles.loadingText, { color: colors.secondaryText }]}>
                Loading chart...
              </ThemedText>
            </View>
          )}

          {/* Chart Content */}
          {!isLoading && (
            <View style={[styles.chartSection, { minHeight: contentHeight }]}>{children}</View>
          )}

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
  chartSection: {
    // Optimized spacing for perfect visual balance
    marginVertical: CHART_LAYOUT.ELEMENT_SPACING * 0.375, // Refined spacing (6px)
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING * 0.125, // Minimal internal padding (2px)
    position: 'relative',
  },
  content: {
    padding: CHART_LAYOUT.CONTENT_PADDING * 0.875, // Slightly reduced padding for better space usage (10.5px)
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CHART_LAYOUT.ELEMENT_SPACING * 1.5,
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING,
  },
  emptyText: {
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 22,
    opacity: 0.75,
    textAlign: 'center',
  },
  footerSection: {
    marginTop: CHART_LAYOUT.ELEMENT_SPACING * 0.75, // Slightly reduced (12px)
    paddingTop: CHART_LAYOUT.ELEMENT_SPACING * 0.25,
  },
  headerSection: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING * 0.875, // 14px - optimized separation for visual hierarchy
  },
  loadingIndicator: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CHART_LAYOUT.ELEMENT_SPACING * 1.5,
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING,
  },
  loadingText: {
    fontSize: 12,
    letterSpacing: 0.15,
    lineHeight: 18,
    opacity: 0.65,
    textAlign: 'center',
  },
  statsSection: {
    marginBottom: CHART_LAYOUT.ELEMENT_SPACING * 0.75, // Reduced from 1.25x to 0.75x (12px)
    paddingHorizontal: CHART_LAYOUT.ELEMENT_SPACING * 0.25, // Gentle horizontal grouping
    paddingVertical: CHART_LAYOUT.ELEMENT_SPACING * 0.25, // Reduced vertical padding (4px)
  },
});
