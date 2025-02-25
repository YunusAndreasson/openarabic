import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { LAYOUT } from '@/constants/layout';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface VocabularyStatsProps {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
}

// Memoize the arc path creation function to prevent recalculation
const createArcPath = (progress: number, radius: number): string => {
  const center = radius;
  const startAngle = -Math.PI / 2; // Start from top
  const endAngle = startAngle + (2 * Math.PI * progress) / 100;

  const x1 = center + radius * Math.cos(startAngle);
  const y1 = center + radius * Math.sin(startAngle);
  const x2 = center + radius * Math.cos(endAngle);
  const y2 = center + radius * Math.sin(endAngle);

  const largeArcFlag = progress > 50 ? 1 : 0;

  return `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};

function VocabularyStatsComponent({ totalWords, masteredWords }: VocabularyStatsProps) {
  const colors = useColors();

  // Use state for animated progress
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Memoize the progress calculation
  const progress = useMemo(
    () => (totalWords > 0 ? (masteredWords / totalWords) * 100 : 0),
    [totalWords, masteredWords]
  );

  // Run animation when progress changes
  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;
    const duration = 1000; // Animation duration in ms
    const startValue = animatedProgress;
    const endValue = progress;

    // Animation function using requestAnimationFrame
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;

      // Calculate progress (0 to 1)
      const animationProgress = Math.min(elapsed / duration, 1);

      // Apply easing function (cubic out)
      const easedProgress = 1 - Math.pow(1 - animationProgress, 3);

      // Calculate current value
      const currentValue = startValue + (endValue - startValue) * easedProgress;

      // Update state
      setAnimatedProgress(currentValue);

      // Continue animation if not finished
      if (animationProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [progress]);

  // Memoize styles
  const progressCardStyle = useMemo(
    () => [
      styles.progressCard,
      {
        backgroundColor: colors.cardBackground,
        shadowColor: colors.shadow,
        borderColor: colors.cardBorder,
      },
    ],
    [colors.cardBackground, colors.shadow, colors.cardBorder]
  );

  const circleBackgroundColor = useMemo(() => `${colors.text}10`, [colors.text]);

  return (
    <View style={progressCardStyle}>
      <View style={styles.progressContent}>
        <View style={styles.progressRow}>
          <View style={styles.progressTextContainer}>
            <ThemedText style={styles.progressLabel}>Progress</ThemedText>
            <ThemedText style={styles.progressValue}>{Math.round(progress)}%</ThemedText>
            <ThemedText style={styles.progressSubtext}>
              {masteredWords} of {totalWords} words mastered
            </ThemedText>
          </View>

          {/* Circular Progress */}
          <View style={styles.circleContainer}>
            <Canvas style={styles.circleCanvas}>
              {/* Background circle */}
              <Circle
                cx={40}
                cy={40}
                r={32}
                color={circleBackgroundColor}
                style="stroke"
                strokeWidth={6}
              />

              {/* Progress arc - using animated progress */}
              <Path
                path={createArcPath(animatedProgress, 32)}
                color={colors.text}
                style="stroke"
                strokeWidth={6}
                transform={[{ translateX: 8 }, { translateY: 8 }]}
              />

              {/* Center dot */}
              <Circle cx={40} cy={40} r={3} color={colors.text} />
            </Canvas>
          </View>
        </View>
      </View>
    </View>
  );
}

// Memoize the entire component
export const VocabularyStats = React.memo(VocabularyStatsComponent);

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    height: 130,
    overflow: 'hidden',
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.LARGE,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  progressTextContainer: {
    flex: 1,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  progressLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  progressValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: '700',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  progressSubtext: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  circleCanvas: {
    width: 80,
    height: 80,
  },
});
