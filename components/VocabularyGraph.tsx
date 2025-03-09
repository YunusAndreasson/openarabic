import React, { useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LoadingContainer } from './Loader';
import { useComponentAnimation } from '@/hooks/animations';
import { useGraphData } from '@/hooks/useGraphData';
import { useAnimatedReaction, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { WeeklyProgressData } from '@/types/vocabulary.types';
import { TIMING_CONFIG } from '@/hooks/animations/animationConfigs';

interface VocabularyGraphProps {
  // Data for the last 7 days
  data: WeeklyProgressData[];
  title?: string;
  isLoading?: boolean;
}

export const VocabularyGraph = React.memo(
  ({ data = [], title = 'Weekly Progress', isLoading = false }: VocabularyGraphProps) => {
    const colors = useColors();
    const { animatedStyle, startAnimation } = useComponentAnimation(500); // Increased delay for better stability
    const [isReady, setIsReady] = React.useState(false);

    // Canvas dimensions
    const PADDING = 16;
    const GRAPH_HEIGHT = 120;
    const GRAPH_WIDTH =
      Dimensions.get('window').width - LAYOUT.SCREEN_EDGE_PADDING * 2 - PADDING * 2;

    // Use the graph data hook to process data
    const { points, areaPath, linePath, totalWordsLearned, dailyAverage } = useGraphData(
      data,
      GRAPH_WIDTH,
      GRAPH_HEIGHT
    );

    // Animation progress value for the graph (0 to 1)
    const animationProgress = useSharedValue(0);
    // State to store the current animation value for Skia
    const [skiaProgress, setSkiaProgress] = React.useState(0);
    // Track if animation has started to avoid restarting
    const hasAnimationStarted = React.useRef(false);

    // Start animation when component mounts
    React.useEffect(() => {
      startAnimation();
      // Set component as ready after a delay
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 600); // Slightly longer than the animation delay

      return () => clearTimeout(timer);
    }, [startAnimation]);

    // Start the animation when the component is ready and data is loaded
    React.useEffect(() => {
      // Only start animation if:
      // 1. Component is ready (mounted and visible)
      // 2. Not in loading state
      // 3. We have data points
      // 4. Animation hasn't already started
      if (isReady && !isLoading && points.length > 0 && !hasAnimationStarted.current) {
        // Mark animation as started
        hasAnimationStarted.current = true;

        // Reset animation value first
        animationProgress.value = 0;

        // Small delay to ensure everything is ready
        const timeout = setTimeout(() => {
          // Run the animation
          animationProgress.value = withTiming(1, {
            duration: 1000,
            easing: TIMING_CONFIG.SLOW.easing,
          });
        }, 100);

        return () => clearTimeout(timeout);
      }
    }, [isReady, isLoading, points.length, animationProgress]);

    // Reset animation state when data changes
    React.useEffect(() => {
      // Reset the animation flag when data changes
      hasAnimationStarted.current = false;
      // Reset progress values
      animationProgress.value = 0;
      setSkiaProgress(0);
    }, [data]);

    // Use animated reaction to update Skia canvas when animation progresses
    useAnimatedReaction(
      () => animationProgress.value,
      currentValue => {
        runOnJS(setSkiaProgress)(currentValue);
      },
      [animationProgress]
    );

    // Card style with theme colors
    const cardStyle = useMemo(
      () => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          shadowColor: colors.shadow,
          borderColor: colors.cardBorder,
        },
      ],
      [colors.cardBackground, colors.shadow, colors.cardBorder]
    );

    // Memoize gradient colors
    const gradientColors = useMemo(() => [`${colors.text}15`, `${colors.text}05`], [colors.text]);

    // Card header with title and icon - reused in both loading and loaded states
    const cardHeader = useMemo(
      () => (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <View style={[styles.iconContainer, { backgroundColor: colors.text + '10' }]}>
              <Ionicons name="trending-up" size={16} color={colors.icon} />
            </View>
          </View>
        </View>
      ),
      [title, colors.text, colors.icon]
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
              color={`${colors.text}10`}
              strokeWidth={1}
            />
          );
        }),
      [GRAPH_HEIGHT, GRAPH_WIDTH, colors.text]
    );

    // Show loading state
    if (isLoading || !isReady) {
      return (
        <View style={cardStyle}>
          {cardHeader}
          <LoadingContainer height={GRAPH_HEIGHT} />
        </View>
      );
    }

    // Show empty state with message when no data is available
    if (data.length === 0) {
      return (
        <View style={cardStyle}>
          {cardHeader}
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>No data available yet</ThemedText>
          </View>
        </View>
      );
    }

    return (
      <Animated.View style={[cardStyle, animatedStyle]}>
        {cardHeader}

        <View style={styles.graphContainer}>
          <Canvas style={styles.canvas}>
            {/* Grid lines */}
            {gridLines}

            {/* Area under the curve with gradient */}
            {points.length > 0 && (
              <Group opacity={skiaProgress}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, GRAPH_HEIGHT)}
                  colors={gradientColors}
                />
                <Path path={areaPath} />
                <BlurMask blur={5} style="normal" />
              </Group>
            )}

            {/* Line for the graph - more subtle */}
            {points.length > 0 && (
              <Group>
                <Path
                  path={linePath}
                  style="stroke"
                  strokeWidth={1.8}
                  color={`${colors.text}60`}
                  strokeJoin="round"
                  strokeCap="round"
                  start={0}
                  end={skiaProgress}
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
                  <Group key={index} opacity={skiaProgress >= pointPosition ? 1 : 0}>
                    {/* Outer circle */}
                    <Circle cx={point.x} cy={point.y} r={4} color={colors.cardBackground} />
                    {/* Inner circle */}
                    <Circle cx={point.x} cy={point.y} r={2} color={`${colors.text}80`} />
                  </Group>
                );
              })}
          </Canvas>

          {/* X-axis labels using regular React Native Text */}
          <View style={styles.xAxisLabels}>
            {data.map((item, index) => {
              const point = points[index];
              if (!point) return null;

              return (
                <View
                  key={index}
                  style={[
                    styles.labelContainer,
                    { left: point.x - 15 }, // Center the label
                  ]}
                >
                  <ThemedText style={styles.labelText}>{item.date}</ThemedText>
                  <ThemedText style={styles.valueText}>{item.wordsLearned}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.cardBorder + '40' }]}>
          <View style={styles.footerContent}>
            <ThemedText style={styles.footerText}>{totalWordsLearned} words learned</ThemedText>
            <ThemedText style={styles.footerSubtext}>
              {dailyAverage} words per day on average
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    );
  }
);

// Add display name
VocabularyGraph.displayName = 'VocabularyGraph';

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  header: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphContainer: {
    paddingHorizontal: LAYOUT.CARD.PADDING.MEDIUM,
    height: 160, // Includes space for labels
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: 120, // Match GRAPH_HEIGHT
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: LAYOUT.CARD.PADDING.MEDIUM,
    right: LAYOUT.CARD.PADDING.MEDIUM,
    height: 40,
    flexDirection: 'row',
  },
  labelContainer: {
    position: 'absolute',
    width: 30,
    alignItems: 'center',
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
  footer: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
    borderTopWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  footerSubtext: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
});
