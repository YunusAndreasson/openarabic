import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
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
import { LAYOUT } from '../constants/layout';
import { LoadingContainer } from './Loader';
import { useGraphAnimation } from '@/hooks/animations';
import { useGraphData } from '@/hooks/useGraphData';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { WeeklyProgressData } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';
import BaseCard from './BaseCard';

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

    // Track if the last point haptic has been triggered
    const lastPointTriggered = useRef(false);

    // Canvas dimensions
    const PADDING = LAYOUT.SPACING.MEDIUM;
    const TOP_PADDING = LAYOUT.SPACING.SMALL; // Increase from 3px to prevent top clipping
    const BOTTOM_PADDING = LAYOUT.SPACING.MEDIUM; // Add bottom padding to prevent floor points from being cut
    const GRAPH_HEIGHT = 120;
    const GRAPH_WIDTH =
      Dimensions.get('window').width - LAYOUT.SCREEN_EDGE_PADDING * 2 - PADDING * 2;

    // Use the graph data hook to process data
    const { points, areaPath, linePath } = useGraphData(
      data,
      GRAPH_WIDTH,
      GRAPH_HEIGHT - TOP_PADDING - BOTTOM_PADDING // Reserve space for both top and bottom padding
    );

    // Use our custom graph animation hook
    const {
      animationProgress,
      startAnimation: startGraphAnimation,
      resetAnimation,
    } = useGraphAnimation(2000);

    // Function to trigger haptic feedback safely from the JS thread
    const triggerHapticFeedback = useCallback(() => {
      if (lastPointTriggered.current) return;
      lastPointTriggered.current = true;

      lightFeedback();
    }, []);

    // Reset the last point triggered flag when points change or animation is reset
    useEffect(() => {
      lastPointTriggered.current = false;
    }, [points.length]);

    // Monitor animation progress to trigger haptic feedback only for the last point
    useAnimatedReaction(
      () => {
        if (points.length === 0) return null;
        return animationProgress.value >= 1;
      },
      reachedLastPoint => {
        if (reachedLastPoint) {
          runOnJS(triggerHapticFeedback)();
        }
      },
      [points.length, triggerHapticFeedback]
    );

    // Set component as ready after a delay
    React.useEffect(() => {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 600);

      return () => clearTimeout(timer);
    }, []);

    // Start the animation when the component is ready and parent signals animation
    React.useEffect(() => {
      // Only start animation if:
      // 1. Component is ready (mounted and visible)
      // 2. Not in loading state
      // 3. We have data points
      // 4. Parent has triggered animations
      if (isReady && !isLoading && points.length > 0 && animationTriggered) {
        // Reset the last point triggered flag
        lastPointTriggered.current = false;

        // Use setTimeout to ensure synchronization with mastery bar
        setTimeout(() => {
          startGraphAnimation();
        }, 50);
      }

      // Reset animation state when parent animation trigger is turned off
      if (!animationTriggered) {
        resetAnimation();
      }
    }, [
      isReady,
      isLoading,
      points.length,
      animationTriggered,
      startGraphAnimation,
      resetAnimation,
    ]);

    // Memoize gradient colors
    const gradientColors = useMemo(
      () => [
        `${colors.text}30`, // Increased from 20 for better contrast
        `${colors.text}10`, // Increased from 08 for better contrast
      ],
      [colors.text]
    );

    // Card header with title - reused in both loading and loaded states
    const cardHeader = useMemo(
      () => (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="caption" weight="500" variant="secondary">
              {title}
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
          height: GRAPH_HEIGHT + 50, // Increase height to accommodate labels
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
          marginBottom: LAYOUT.SPACING.SMALL, // Use LAYOUT constant instead of hardcoded 10
        },
      ],
      [GRAPH_HEIGHT, GRAPH_WIDTH]
    );

    // Custom loading component for the card
    const loadingComponent = (
      <View style={[graphContainerStyle, styles.loadingContainer]}>
        <LoadingContainer size="small" />
        <ThemedText type="body" variant="secondary">
          {data.length === 0 ? 'No data available' : 'Loading data...'}
        </ThemedText>
      </View>
    );

    const hasData = data.length > 0;

    return (
      <View
        accessible={true}
        accessibilityLabel={`Vocabulary progress graph for the last ${data.length} days`}
        accessibilityHint="Shows your daily word learning progress"
      >
        <BaseCard
          style={styles.card}
          isLoading={isLoading || !hasData}
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
                    color={`${colors.text}15`}
                    strokeWidth={1}
                  />
                );
              })}

              {/* Area under the curve with gradient */}
              {hasData && (
                <Group opacity={animationProgress} transform={[{ translateY: TOP_PADDING }]}>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, GRAPH_HEIGHT - TOP_PADDING - BOTTOM_PADDING)}
                    colors={gradientColors}
                  />
                  <Path path={areaPath} />
                  <BlurMask blur={5} style="normal" />
                </Group>
              )}

              {/* Line for the graph - more subtle */}
              {hasData && (
                <Group transform={[{ translateY: TOP_PADDING }]}>
                  <Path
                    path={linePath}
                    style="stroke"
                    strokeWidth={2.5}
                    color={`${colors.text}70`}
                    strokeJoin="round"
                    strokeCap="round"
                    start={0}
                    end={animationProgress}
                  />
                  <BlurMask blur={1} style="normal" />
                </Group>
              )}

              {/* Data points */}
              {hasData &&
                points.map((point, index) => {
                  // Calculate the point's position in the animation sequence
                  const pointPosition = index / (points.length - 1);

                  return (
                    <Group
                      key={index}
                      opacity={animationProgress.value >= pointPosition ? 1 : 0}
                      transform={[{ translateY: TOP_PADDING }]}
                    >
                      {/* Outer circle */}
                      <Circle cx={point.x} cy={point.y} r={5} color={colors.cardBackground} />
                      {/* Inner circle */}
                      <Circle cx={point.x} cy={point.y} r={2.5} color={`${colors.text}90`} />
                    </Group>
                  );
                })}
            </Canvas>

            {/* X-axis labels using regular React Native Text */}
            <View
              style={[styles.xAxisLabels, { bottom: LAYOUT.SPACING.TINY }]}
              accessible={true}
              accessibilityLabel="Date and word count labels"
            >
              {data.map((item, index) => (
                <View
                  key={index}
                  style={styles.labelContainer}
                  accessible={true}
                  accessibilityLabel={`${item.date}: ${item.wordsLearned} words learned`}
                >
                  <ThemedText type="caption" variant="primary" weight="500">
                    {item.date}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    variant="secondary"
                    weight="400"
                    style={styles.wordCountText}
                  >
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
  card: {
    width: '100%',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  graphContainer: {
    width: '100%',
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  canvas: {
    // Dimensions are set dynamically in the component
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  labelContainer: {
    width: 32,
    alignItems: 'center',
    position: 'relative',
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  wordCountText: {
    fontSize: 10,
    marginTop: 2,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
