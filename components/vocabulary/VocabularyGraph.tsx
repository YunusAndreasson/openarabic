import {
  Canvas,
  Path,
  Line,
  Circle,
  Group,
  BlurMask,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo, useEffect, memo, useState } from 'react';
import { StyleSheet, View, Dimensions, ActivityIndicator } from 'react-native';
import { useSharedValue, withTiming, useDerivedValue } from 'react-native-reanimated';

import { useGraphData } from '@/hooks/useGraphData';
import type { WeeklyProgressData } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';
import { handleError } from '@/utils/errorHandling';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

interface VocabularyGraphProps {
  // Data for the last 7 days
  data: WeeklyProgressData[];
  title?: string;
  isLoading?: boolean;
  // Flag to trigger animations when parent component is ready
  animationTriggered?: boolean;
}

export const VocabularyGraph = memo(
  ({
    data = [],
    title = 'Progress',
    isLoading = false,
    animationTriggered = false,
  }: VocabularyGraphProps) => {
    const colors = useColors();
    const [hasError, setHasError] = useState(false);

    // Use Reanimated's shared value for animation
    const progress = useSharedValue(0);

    // Create derived value for opacity
    const opacity = useDerivedValue(() => progress.value);

    // Canvas dimensions with safe defaults
    const dimensions = useMemo(
      () => ({
        padding: LAYOUT.SPACING.MEDIUM,
        topPadding: LAYOUT.SPACING.LARGE,
        bottomPadding: LAYOUT.SPACING.LARGE,
        pointRadius: 2.5,
        pointStroke: 1.5,
        graphHeight: 120,
        graphWidth: Math.max(
          100,
          Dimensions.get('window').width -
            LAYOUT.SPACING.MEDIUM * 2 -
            LAYOUT.SCREEN_EDGE_PADDING * 2
        ),
      }),
      []
    );

    // Validate data before processing
    const validData = useMemo(() => {
      try {
        return data.filter(
          item =>
            item &&
            typeof item === 'object' &&
            typeof item.date === 'string' &&
            typeof item.wordsLearned === 'number' &&
            !isNaN(item.wordsLearned)
        );
      } catch (error) {
        setHasError(true);
        handleError(error instanceof Error ? error : String(error));
        return [];
      }
    }, [data]);

    // Use graph data hook to generate points and paths with error handling
    const { points, areaPath, linePath } = useGraphData(
      validData,
      dimensions.graphWidth - dimensions.pointRadius * 4,
      dimensions.graphHeight - dimensions.topPadding - dimensions.bottomPadding
    );

    // Start the animation when ready
    useEffect(() => {
      if (!isLoading && points.length > 0 && animationTriggered && !hasError) {
        progress.value = withTiming(1, { duration: 2000 });
      } else if (!animationTriggered) {
        progress.value = 0;
      }
    }, [isLoading, points.length, animationTriggered, hasError, progress]);

    // Memoize gradient colors
    const gradientColors = useMemo(
      () => [withOpacity(colors.text, 0.19), withOpacity(colors.text, 0.06)],
      [colors.text]
    );

    // Card header with title - reused in both loading and loaded states
    const cardHeader = useMemo(
      () => (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="overline" weight="medium" variant="secondary">
              {title.toUpperCase()}
            </ThemedText>
          </View>
        </View>
      ),
      [title]
    );

    // Define styles with dimensions
    const graphContainerStyle = useMemo(
      () => [
        styles.graphContainer,
        {
          height: dimensions.graphHeight + 50,
        },
      ],
      [dimensions.graphHeight]
    );

    const canvasStyle = useMemo(
      () => [
        styles.canvas,
        {
          height: dimensions.graphHeight,
          width: dimensions.graphWidth,
          marginBottom: LAYOUT.SPACING.SMALL,
        },
      ],
      [dimensions.graphHeight, dimensions.graphWidth]
    );

    // Error state component
    const errorComponent = (
      <View style={[graphContainerStyle, styles.loadingContainer]}>
        <ThemedText type="body" variant="secondary">
          Unable to display graph
        </ThemedText>
      </View>
    );

    // Loading component
    const loadingComponent = (
      <View style={[graphContainerStyle, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.tint} />
        <ThemedText type="body" variant="secondary">
          Loading data...
        </ThemedText>
      </View>
    );

    // If there's an error or no valid data, show error state
    if (hasError || validData.length === 0) {
      return (
        <BaseCard style={styles.card} includePressAnimation={false} shadowSize="medium">
          {cardHeader}
          {errorComponent}
        </BaseCard>
      );
    }

    return (
      <View>
        <BaseCard
          style={styles.card}
          isLoading={isLoading}
          loadingComponent={loadingComponent}
          includePressAnimation={false}
          shadowSize="medium"
        >
          {cardHeader}
          <View style={graphContainerStyle}>
            <Canvas style={canvasStyle}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const y =
                  ratio * (dimensions.graphHeight - dimensions.bottomPadding) +
                  dimensions.topPadding;
                return (
                  <Line
                    key={`grid-line-${ratio}`}
                    p1={{ x: 0, y }}
                    p2={{ x: dimensions.graphWidth, y }}
                    color={withOpacity(colors.text, 0.08)}
                    strokeWidth={1}
                  />
                );
              })}

              {/* Area under the curve with gradient */}
              <Group opacity={opacity} transform={[{ translateY: dimensions.topPadding }]}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(
                    0,
                    dimensions.graphHeight - dimensions.topPadding - dimensions.bottomPadding
                  )}
                  colors={gradientColors}
                />
                <Path path={areaPath} />
                <BlurMask blur={5} style="normal" />
              </Group>

              {/* Line for the graph */}
              <Group transform={[{ translateY: dimensions.topPadding }]}>
                <Path
                  path={linePath}
                  style="stroke"
                  strokeWidth={2.5}
                  color={withOpacity(colors.text, 0.44)}
                  strokeJoin="round"
                  strokeCap="round"
                  start={0}
                  end={opacity}
                />
                <BlurMask blur={1} style="normal" />
              </Group>

              {/* Data points */}
              <Group opacity={opacity} transform={[{ translateX: dimensions.pointRadius * 2 }]}>
                {points.map(point => (
                  <Group key={`data-point-${point.x}-${point.y}`}>
                    <Circle
                      cx={point.x}
                      cy={point.y + dimensions.topPadding}
                      r={dimensions.pointRadius + dimensions.pointStroke}
                      color={colors.cardBackground}
                    />
                    <Circle
                      cx={point.x}
                      cy={point.y + dimensions.topPadding}
                      r={dimensions.pointRadius}
                      color={colors.text}
                      style="fill"
                    />
                  </Group>
                ))}
              </Group>
            </Canvas>

            {/* X-axis labels */}
            <View style={[styles.xAxisLabels, { bottom: LAYOUT.SPACING.TINY }]}>
              {validData.map(item => (
                <View key={`x-axis-label-${item.date}`} style={styles.labelContainer}>
                  <ThemedText type="caption" variant="primary">
                    {item.date}
                  </ThemedText>
                  <ThemedText type="caption" variant="secondary" style={styles.wordCount}>
                    {item.wordsLearned}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </BaseCard>
      </View>
    );
  }
);

// Add display name
VocabularyGraph.displayName = 'VocabularyGraph';

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
  },
  card: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    width: '100%',
  },
  graphContainer: {
    alignItems: 'center',
  },
  header: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  labelContainer: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY / 2,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wordCount: {
    fontSize: 10,
    opacity: 0.7,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
