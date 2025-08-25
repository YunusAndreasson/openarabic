import { memo, type ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Y_AXIS_WIDTH } from '@charts/ChartAxes';
import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface BaseChartProps {
  // Header props (optional when hideTitle is true)
  title?: string;
  subtitle?: string;
  hideTitle?: boolean;
  onCardPress?: () => void;

  // Content props
  children: ReactNode;
  hasData: boolean;
  bottomSummary?: { label: string; value: string }[];

  // Layout props
  contentHeight?: number;
  emptyStateText?: string;
}

/**
 * Base chart component that provides consistent structure
 * and state handling across all vocabulary charts.
 */
export const BaseChart = memo(
  ({
    title = '',
    subtitle = '',
    hideTitle = false,
    onCardPress,
    children,
    hasData,
    contentHeight = 176, // Optimized to match GRAPH_HEIGHT_LARGE
    emptyStateText = 'Add your first words to start tracking your progress',
    bottomSummary,
  }: BaseChartProps) => {
    const colors = useColors();

    const emptyContainerStyle = useMemo(
      () => [styles.emptyContainer, { backgroundColor: colors.elevation2 }],
      [colors.elevation2]
    );

    const chartSectionStyle = useMemo(
      () => [styles.chartSection, { minHeight: contentHeight }],
      [contentHeight]
    );

    // Empty state
    if (!hasData) {
      return (
        <BaseCard  shadowSize="small" onPress={onCardPress}>
          <View style={styles.content}>
            {!hideTitle && (
              <View style={styles.titleGroup}>
                <ThemedText style={styles.cardTitle} type="heading2" weight="bold">
                  {title}
                </ThemedText>
                <ThemedText style={styles.cardSubtitle} type="caption" variant="secondary">
                  {subtitle}
                </ThemedText>
              </View>
            )}
            <View style={emptyContainerStyle}>
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
      <BaseCard  shadowSize="small" onPress={onCardPress}>
        <View style={styles.content}>
          {/* Header Section */}
          {!hideTitle && (
            <View style={styles.headerSection}>
              <View style={styles.titleGroup}>
                <ThemedText style={styles.cardTitle} type="heading2" weight="bold">
                  {title}
                </ThemedText>
                <ThemedText style={styles.cardSubtitle} type="caption" variant="secondary">
                  {subtitle}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Chart Content */}
          <View style={chartSectionStyle}>{children}</View>

          {hasData && bottomSummary && bottomSummary.length > 0 ? (
            <View style={styles.summaryRow}>
              {bottomSummary.map(item => (
                <View key={item.label} style={styles.summaryItem}>
                  <ThemedText
                    type="caption"
                    variant="secondary"
                    weight="bold"
                    style={styles.summaryLabel}
                  >
                    {item.label}
                  </ThemedText>
                  <ThemedText type="caption" style={styles.summaryValue}>
                    {item.value}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </BaseCard>
    );
  }
);

BaseChart.displayName = 'BaseChart';

const styles = StyleSheet.create({
  chartSection: {
    // Optimized spacing for perfect visual balance
    marginVertical: LAYOUT.SPACING.SMALL - LAYOUT.SPACING.HALF_TINY, // 6px
    paddingVertical: LAYOUT.SPACING.HALF_TINY, // 2px
    position: 'relative',
  },
  content: {
    paddingTop: LAYOUT.SPACING.MEDIUM - LAYOUT.SPACING.HALF_TINY, // Top padding for content
    paddingBottom: LAYOUT.SPACING.TINY, // Minimal bottom padding for tight layout
    paddingHorizontal: LAYOUT.SPACING.TINY, // Minimal horizontal padding for charts
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.SMALL,
    marginLeft: Y_AXIS_WIDTH,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  summaryItem: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    marginBottom: 2,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    fontWeight: '400',
  },
  emptyContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XXLARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    opacity: LAYOUT.OPACITY.HIGH,
    textAlign: 'center',
  },
  headerSection: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.HALF_TINY, // 14px
  },
  titleGroup: {
    flex: 1,
  },
  cardTitle: {
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
    marginBottom: 0,
  },
  cardSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
