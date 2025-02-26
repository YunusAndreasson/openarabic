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
import { Loader } from './Loader';
import { useComponentAnimation } from '@/hooks/useComponentAnimation';
import { useGraphData } from '@/hooks/useGraphData';

interface VocabularyGraphProps {
  // Data for the last 7 days
  data: {
    date: string; // Format: "Mon", "Tue", etc.
    wordsLearned: number;
  }[];
  title?: string;
  isLoading?: boolean;
}

export const VocabularyGraph = React.memo(
  ({ data = [], title = 'Weekly Progress', isLoading = false }: VocabularyGraphProps) => {
    const colors = useColors();
    const { isReady } = useComponentAnimation();

    // Canvas dimensions
    const PADDING = 16;
    const GRAPH_HEIGHT = 120;
    const GRAPH_WIDTH =
      Dimensions.get('window').width - LAYOUT.SCREEN_EDGE_PADDING * 2 - PADDING * 2;

    // Use the graph data hook to process data
    const { points, areaPath, linePath, totalWordsLearned, dailyAverage, maxValue } = useGraphData(
      data,
      GRAPH_WIDTH,
      GRAPH_HEIGHT
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
    const cardHeader = (
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <View style={[styles.iconContainer, { backgroundColor: colors.text + '10' }]}>
            <Ionicons name="trending-up" size={16} color={colors.icon} />
          </View>
        </View>
      </View>
    );

    // Show loading state
    if (isLoading || !isReady) {
      return (
        <View style={cardStyle}>
          {cardHeader}
          <View style={styles.loadingContainer}>
            <Loader size="small" color={colors.tint} />
            <ThemedText style={styles.loadingText}>Loading graph...</ThemedText>
          </View>
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
      <View style={cardStyle}>
        {cardHeader}

        <View style={styles.graphContainer}>
          <Canvas style={styles.canvas}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
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
            })}

            {/* Area under the curve with gradient */}
            {points.length > 0 && (
              <Group>
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
                />
                <BlurMask blur={1} style="normal" />
              </Group>
            )}

            {/* Data points */}
            {points.length > 0 &&
              points.map((point, index) => (
                <Group key={index}>
                  {/* Outer circle */}
                  <Circle cx={point.x} cy={point.y} r={4} color={colors.cardBackground} />
                  {/* Inner circle */}
                  <Circle cx={point.x} cy={point.y} r={2} color={`${colors.text}80`} />
                </Group>
              ))}
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
      </View>
    );
  }
);

// Add display name
VocabularyGraph.displayName = 'VocabularyGraph';

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
    borderRadius: 14,
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
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
});
