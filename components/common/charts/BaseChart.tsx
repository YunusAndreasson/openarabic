import { Y_AXIS_WIDTH } from './ChartAxes';
import { BaseCard } from '@/components/common/BaseCard';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, LETTER_SPACING, LINE_HEIGHT_MULTIPLIERS, TEXT_STYLES } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface BaseChartProps {
  // Header props (optional when hideTitle is true)
  title?: string;
  subtitle?: string;
  hideTitle?: boolean;

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
export function BaseChart({
  title = '',
  subtitle = '',
  hideTitle = true,
  children,
  hasData,
  contentHeight = 176, // Optimized to match GRAPH_HEIGHT_LARGE
  emptyStateText = STRINGS.CHART_EMPTY_STATE,
  bottomSummary,
}: BaseChartProps) {
  const colors = useColors();

  // minHeight matches the chart section so no layout shift when data arrives
  const emptyContainerStyle = [
    styles.emptyContainer,
    { backgroundColor: colors.elevation2, minHeight: contentHeight },
  ];
  const chartSectionStyle = [styles.chartSection, { minHeight: contentHeight }];

  // Empty state
  if (!hasData) {
    return (
      <BaseCard>
        <View style={styles.content}>
          {!hideTitle && (
            <View style={styles.titleGroup}>
              <ThemedText style={styles.cardTitle} type="heading2">
                {title}
              </ThemedText>
              <ThemedText style={styles.cardSubtitle} type="caption" colorName="secondaryText">
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
    <BaseCard>
      <View style={styles.content}>
        {/* Header Section */}
        {!hideTitle && (
          <View style={styles.headerSection}>
            <View style={styles.titleGroup}>
              <ThemedText style={styles.cardTitle} type="heading2">
                {title}
              </ThemedText>
              <ThemedText style={styles.cardSubtitle} type="caption" colorName="secondaryText">
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
                <ThemedText type="caption" colorName="subtleLabelText" style={styles.summaryLabel}>
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
    paddingHorizontal: LAYOUT.SPACING.HALF_TINY, // Reduced horizontal padding for charts
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
    marginBottom: LAYOUT.SPACING.HALF_TINY,
    fontFamily: FONTS.ENGLISH,
  },
  summaryValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
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
    letterSpacing: LETTER_SPACING.WIDE,
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * TEXT_STYLES.SECTION_HEADER.lineHeightMultiplier,
    marginBottom: 0,
  },
  cardSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    marginTop: LAYOUT.SPACING.TINY,
  },
});
