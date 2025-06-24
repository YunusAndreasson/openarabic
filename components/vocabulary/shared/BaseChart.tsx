/* eslint-disable react/no-array-index-key */
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { LegendItemProps } from '@/types/ui/chart.types';

import { CardHeader } from './CardHeader';
import { ChartFooter } from './ChartFooter';

interface BaseChartProps {
  // Header props (optional when hideTitle is true)
  title?: string;
  subtitle?: string;
  onInfoPress?: () => void;
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

const ChartSkeleton = memo(({ contentHeight }: { contentHeight: number }) => {
  const colors = useColors();
  const shimmerValue = useSharedValue(0);

  shimmerValue.value = withRepeat(
    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
    -1,
    true
  );

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmerValue.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <View style={[styles.skeletonContainer, { minHeight: contentHeight }]}>
      {/* Chart area skeleton */}
      <View style={styles.skeletonChart}>
        {/* Mock chart lines */}
        {[...Array(4)].map((_, index) => (
          <Animated.View
            key={`skeleton-line-${index}`}
            style={[
              styles.skeletonLine,
              {
                backgroundColor: colors.border,
                width: `${85 + Math.random() * 15}%`,
                marginBottom: LAYOUT.SPACING.MEDIUM,
              },
              shimmerStyle,
            ]}
          />
        ))}

        {/* Mock data points */}
        <View style={styles.skeletonPoints}>
          {[...Array(7)].map((_, index) => (
            <Animated.View
              key={`skeleton-point-${index}`}
              style={[
                styles.skeletonPoint,
                {
                  backgroundColor: colors.tintBackground,
                  left: `${(index * 100) / 6}%`,
                  top: Math.random() * 60 + 20,
                },
                shimmerStyle,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Mock axes */}
      <View style={styles.skeletonAxes}>
        <Animated.View
          style={[styles.skeletonAxisLabel, { backgroundColor: colors.border }, shimmerStyle]}
        />
        <Animated.View
          style={[styles.skeletonAxisLabel, { backgroundColor: colors.border }, shimmerStyle]}
        />
      </View>
    </View>
  );
});

ChartSkeleton.displayName = 'ChartSkeleton';

/**
 * Base chart component that provides consistent structure, animations,
 * and state handling across all vocabulary charts.
 */
export const BaseChart = memo(
  ({
    title = '',
    subtitle = '',
    onInfoPress = () => {},
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
              <CardHeader
                subtitle={STRINGS.ERROR_LOADING_DATA}
                title={title}
                onInfoPress={onInfoPress}
              />
            )}
            <View style={[styles.emptyContainer, { backgroundColor: colors.elevation2 }]}>
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
      <BaseCard includePressAnimation={false} shadowSize="small">
        <View style={styles.content}>
          {/* Header Section */}
          {!hideTitle && (
            <View style={styles.headerSection}>
              <CardHeader subtitle={subtitle} title={title} onInfoPress={onInfoPress} />
            </View>
          )}

          {/* Loading State with Skeleton */}
          {isLoading && <ChartSkeleton contentHeight={contentHeight} />}

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
    paddingTop: LAYOUT.SPACING.MEDIUM - LAYOUT.SPACING.TINY / 2, // Top padding for content
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
  footerSection: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  headerSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY / 2, // 14px
  },
  skeletonContainer: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
  },
  skeletonChart: {
    height: LAYOUT.TOUCH_TARGET.LARGE * 2.5, // Responsive chart height
    position: 'relative',
  },
  skeletonLine: {
    borderRadius: 2,
    height: 3,
  },
  skeletonPoints: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  skeletonPoint: {
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  skeletonAxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.SMALL,
  },
  skeletonAxisLabel: {
    borderRadius: 4,
    height: 12,
    width: 40,
  },
});
