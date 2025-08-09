import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

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
  }: BaseChartProps) => {
    const colors = useColors();

    // Empty state
    if (!hasData) {
      return (
        <BaseCard includePressAnimation={!!onCardPress} shadowSize="small" onPress={onCardPress}>
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
            <View style={[styles.emptyContainer, { backgroundColor: colors.elevation2 }]}>
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
      <BaseCard includePressAnimation={!!onCardPress} shadowSize="small" onPress={onCardPress}>
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
          <View style={[styles.chartSection, { minHeight: contentHeight }]}>{children}</View>
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
