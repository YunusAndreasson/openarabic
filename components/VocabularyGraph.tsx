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
import { useComponentAnimation, useGraphAnimation } from '@/hooks/animations';
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
    const { animatedStyle, startAnimation } = useComponentAnimation(500); // Increased delay for better stability
    const [isReady, setIsReady] = React.useState(false);

    // Track if the last point haptic has been triggered
    const lastPointTriggered = useRef(false);

    // Canvas dimensions
    const PADDING = 16;
    const TOP_PADDING = 3; // Minimal padding to prevent clipping without excessive space
    const GRAPH_HEIGHT = 120;
    const GRAPH_WIDTH =
      Dimensions.get('window').width - LAYOUT.SCREEN_EDGE_PADDING * 2 - PADDING * 2;

    // Use the graph data hook to process data
    const { points, areaPath, linePath } = useGraphData(
      data,
      GRAPH_WIDTH,
      GRAPH_HEIGHT - TOP_PADDING // Reserve space for top padding
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

    // Start animation when component mounts
    React.useEffect(() => {
      startAnimation();
      // Set component as ready after a delay
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 600); // Slightly longer than the animation delay

      return () => clearTimeout(timer);
    }, [startAnimation]);

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
    const gradientColors = useMemo(() => [`${colors.text}20`, `${colors.text}08`], [colors.text]);

    // Card header with title - reused in both loading and loaded states
    const cardHeader = useMemo(
      () => (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>{title}</ThemedText>
          </View>
        </View>
      ),
      [title]
    );

    // Memoize the grid lines to avoid recreating them on each render
    const gridLines = useMemo(
      () =>
        [0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = GRAPH_HEIGHT * ratio;
          return (
            <Line
              key={index}
              p1={{ x: 0, y }}
              p2={{ x: GRAPH_WIDTH, y }}
              color={`${colors.text}15`}
              strokeWidth={1}
            />
          );
        }),
      [GRAPH_HEIGHT, GRAPH_WIDTH, colors.text]
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
          marginBottom: 10, // Add margin to separate from labels
        },
      ],
      [GRAPH_HEIGHT, GRAPH_WIDTH]
    );

    // Custom loading component for the card
    const loadingComponent = (
      <View style={[graphContainerStyle, styles.loadingContainer]}>
        <LoadingContainer size="small" />
        <ThemedText style={styles.loadingText}>
          {data.length === 0 ? 'No data available' : 'Loading data...'}
        </ThemedText>
      </View>
    );

    return (
      <BaseCard
        style={styles.card}
        isLoading={isLoading || data.length === 0}
        loadingComponent={loadingComponent}
        animated={true}
        includePressAnimation={false}
        shadowSize="medium"
      >
        {cardHeader}

        <View style={graphContainerStyle}>
          <Canvas style={canvasStyle}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = ratio * GRAPH_HEIGHT;
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
            {points.length > 0 && (
              <Group opacity={animationProgress} transform={[{ translateY: TOP_PADDING }]}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, GRAPH_HEIGHT - TOP_PADDING)}
                  colors={gradientColors}
                />
                <Path path={areaPath} />
                <BlurMask blur={5} style="normal" />
              </Group>
            )}

            {/* Line for the graph - more subtle */}
            {points.length > 0 && (
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
            {points.length > 0 &&
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
          <View style={styles.xAxisLabels}>
            {data.map((item, index) => (
              <View key={index} style={styles.labelContainer}>
                <ThemedText style={styles.labelText}>{item.date}</ThemedText>
                <ThemedText style={styles.valueText}>{item.wordsLearned}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </BaseCard>
    );
  }
);

// Add display name
VocabularyGraph.displayName = 'VocabularyGraph';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 250,
    padding: 16,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
  },
  graphContainer: {
    width: '100%',
  },
  canvas: {
    // Dimensions are set dynamically in the component
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  labelContainer: {
    width: 30,
    alignItems: 'center',
    position: 'relative',
  },
  labelText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.DISABLED,
    marginBottom: 2,
  },
  valueText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: LAYOUT.SPACING.SMALL,
    opacity: 0.7,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
