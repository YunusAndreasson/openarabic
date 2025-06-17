import { memo, type ReactNode } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { LegendItemProps } from '@/types/ui/chart.types';

import { CardHeader } from './CardHeader';
import { ChartFooter } from './ChartFooter';

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
    emptyStateText = STRINGS.STUDY_WORDS_TO_SEE_PROGRESS,
    errorText = STRINGS.UNABLE_TO_LOAD_CHART_DATA,
  }: BaseChartProps) => {
    const colors = useColors();

    // Error state
    if (error) {
      return (
        <BaseCard includePressAnimation={false} shadowSize="small">
          <View style={styles.content}>
            {!hideTitle && (
              <CardHeader subtitle={STRINGS.ERROR_LOADING_DATA} title={title} onInfoPress={onInfoPress} />
            )}
            <View style={[styles.emptyContainer, { backgroundColor: colors.elevation1 }]}>
              <ThemedText colorName="error" style={styles.emptyText}>
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
            <View style={[styles.emptyContainer, { backgroundColor: colors.elevation1 }]}>
              <ThemedText colorName="secondaryText" style={styles.emptyText}>
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
            <View style={[styles.loadingContainer, { backgroundColor: colors.elevation1 }]}>
              <ActivityIndicator color={colors.tint} size="large" />
              <ThemedText colorName="secondaryText" style={styles.loadingText}>
                {STRINGS.LOADING_CHART}
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
    marginVertical: LAYOUT.SPACING.TINY + LAYOUT.SPACING.TINY / 2, // 6px
    paddingVertical: LAYOUT.SPACING.TINY / 2, // 2px
    position: 'relative',
  },
  content: {
    padding: LAYOUT.SPACING.MEDIUM - LAYOUT.SPACING.TINY / 2, // 10.5px → use 10px
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    opacity: LAYOUT.OPACITY.HIGH,
    textAlign: 'center',
  },
  footerSection: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  headerSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY / 2, // 14px
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  loadingText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.15,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    opacity: LAYOUT.OPACITY.HIGH - 0.05,
    textAlign: 'center',
  },
  statsSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
});
