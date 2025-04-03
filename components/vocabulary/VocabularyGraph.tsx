import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '../../hooks/useColors';
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
import { useSharedValue, withTiming, useDerivedValue } from 'react-native-reanimated';
import { LAYOUT } from '../../constants/layout';
import { LoadingContainer } from '../Loader';
import { useGraphData } from '@/hooks/useGraphData';
import { WeeklyProgressData } from '@/types/vocabulary.types';
import BaseCard from '../BaseCard';
import { withOpacity } from '@/utils/colorUtils';
import { handleError } from '@/utils/errorHandling';

interface VocabularyGraphProps {
  // Data for the last 7 days
  data: WeeklyProgressData[];
  title?: string;
  isLoading?: boolean;
  // Flag to trigger animations when parent component is ready
  animationTriggered?: boolean;
}

export const VocabularyGraph = React.memo(
  ({
    data = [],
    title = 'Progress',
    isLoading = false,
    animationTriggered = false,
  }: VocabularyGraphProps) => {
    const colors = useColors();
    const [isReady, setIsReady] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    // Use Reanimated's shared value for animation
    const progress = useSharedValue(0);

    // Create derived value for opacity
    const opacity = useDerivedValue(() => progress.value);

    // Canvas dimensions with safe defaults
    const PADDING = LAYOUT.SPACING.MEDIUM;
    const TOP_PADDING = LAYOUT.SPACING.LARGE;
    const BOTTOM_PADDING = LAYOUT.SPACING.LARGE;
    const POINT_RADIUS = 2.5;
    const POINT_STROKE = 1.5;
    const GRAPH_HEIGHT = 120;
    const GRAPH_WIDTH = Math.max(
      100,
      Dimensions.get('window').width - PADDING * 2 - LAYOUT.SCREEN_EDGE_PADDING * 2
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

    // Set component as ready after initial mount
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 0);

      return () => clearTimeout(timer);
    }, []);

    // Use graph data hook to generate points and paths with error handling
    const { points, areaPath, linePath } = useGraphData(
      validData,
      GRAPH_WIDTH - POINT_RADIUS * 4,
      GRAPH_HEIGHT - TOP_PADDING - BOTTOM_PADDING
    );

    // Start the animation when the component is ready and parent signals animation
    useEffect(() => {
      if (isReady && !isLoading && points.length > 0 && animationTriggered && !hasError) {
        progress.value = withTiming(1, { duration: 2000 });
      } else if (!animationTriggered) {
        progress.value = 0;
      }
    }, [isReady, isLoading, points.length, animationTriggered, hasError, progress]);

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
            <ThemedText type="overline" variant="secondary">
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
          height: GRAPH_HEIGHT + 50,
        },
      ],
      [GRAPH_HEIGHT]
    );

    const canvasStyle = useMemo(
      () => [
        styles.canvas,
        {
          height: GRAPH_HEIGHT,
          width: GRAPH_WIDTH,
          marginBottom: LAYOUT.SPACING.SMALL,
        },
      ],
      [GRAPH_HEIGHT, GRAPH_WIDTH]
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
        <LoadingContainer size="small" />
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
      <View
        accessible={true}
        accessibilityLabel={`Vocabulary progress graph for the last ${validData.length} days`}
        accessibilityHint="Shows your daily word learning progress"
      >
        <BaseCard
          style={styles.card}
          isLoading={isLoading}
          loadingComponent={loadingComponent}
          includePressAnimation={false}
          shadowSize="medium"
        >
          {cardHeader}
          <View
            style={graphContainerStyle}
            accessible={true}
            accessibilityLabel="Graph showing vocabulary progress over time"
          >
            <Canvas style={canvasStyle}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = ratio * (GRAPH_HEIGHT - BOTTOM_PADDING) + TOP_PADDING;
                return (
                  <Line
                    key={index}
                    p1={{ x: 0, y }}
                    p2={{ x: GRAPH_WIDTH, y }}
                    color={withOpacity(colors.text, 0.08)}
                    strokeWidth={1}
                  />
                );
              })}

              {/* Area under the curve with gradient */}
              <Group opacity={opacity} transform={[{ translateY: TOP_PADDING }]}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, GRAPH_HEIGHT - TOP_PADDING - BOTTOM_PADDING)}
                  colors={gradientColors}
                />
                <Path path={areaPath} />
                <BlurMask blur={5} style="normal" />
              </Group>

              {/* Line for the graph */}
              <Group transform={[{ translateY: TOP_PADDING }]}>
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
              <Group opacity={opacity} transform={[{ translateX: POINT_RADIUS * 2 }]}>
                {points.map((point, index) => (
                  <Group key={index}>
                    <Circle
                      cx={point.x}
                      cy={point.y + TOP_PADDING}
                      r={POINT_RADIUS + POINT_STROKE}
                      color={colors.cardBackground}
                    />
                    <Circle
                      cx={point.x}
                      cy={point.y + TOP_PADDING}
                      r={POINT_RADIUS}
                      color={colors.text}
                      style="fill"
                    />
                  </Group>
                ))}
              </Group>
            </Canvas>

            {/* X-axis labels */}
            <View
              style={[styles.xAxisLabels, { bottom: LAYOUT.SPACING.TINY }]}
              accessible={true}
              accessibilityLabel="Date and word count labels"
            >
              {validData.map((item, index) => (
                <View
                  key={index}
                  style={styles.labelContainer}
                  accessible={true}
                  accessibilityLabel={`${item.date}: ${item.wordsLearned} words learned`}
                >
                  <ThemedText type="caption" variant="primary" weight="500">
                    {item.date}
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
  },
  graphContainer: {
    alignItems: 'center',
  },
  header: {
    paddingBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  labelContainer: {
    alignItems: 'center',
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
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
});
