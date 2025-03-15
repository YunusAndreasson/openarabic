import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { LAYOUT } from '@/constants/layout';
import { LoadingContainer } from './Loader';
import { useComponentAnimation } from '@/hooks/animations';
import { createArcPath } from '@/utils/graphUtils';
import { VocabularyStats as VocabularyStatsType } from '@/types/vocabulary.types';
import { VocabularyStatsProps } from '@/types/ui.types';

function VocabularyStatsComponent({
  totalWords,
  masteredWords,
  isLoading = false,
}: VocabularyStatsProps) {
  const colors = useColors();
  const { animatedStyle, startAnimation } = useComponentAnimation();
  const [isReady, setIsReady] = React.useState(false);

  // Start animation when component mounts
  React.useEffect(() => {
    startAnimation();
    // Set component as ready after a delay
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 400); // Slightly longer than the animation delay

    return () => clearTimeout(timer);
  }, [startAnimation]);

  // Calculate progress as a percentage - protect against division by zero
  const progress = useMemo(
    () => (totalWords > 0 ? (masteredWords / totalWords) * 100 : 0),
    [totalWords, masteredWords]
  );

  // Custom hook to animate progress value
  const useProgressAnimation = (targetValue: number, duration = 1000, isReady = true) => {
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
      if (!isReady) return;

      let startTimestamp: number | null = null;
      let animationFrameId: number;

      const animate = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;

        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        setAnimatedValue(targetValue * easedProgress);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [targetValue, duration, isReady]);

    return animatedValue;
  };

  // Use the animation hook to animate the progress
  const animatedProgress = useProgressAnimation(progress, 1000, isReady);

  // Memoize styles to prevent unnecessary re-renders
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

  // Show loading state
  if (isLoading || !isReady) {
    return (
      <View style={progressCardStyle}>
        <LoadingContainer height={100} />
      </View>
    );
  }

  return (
    <Animated.View style={[progressCardStyle, animatedStyle]}>
      <View style={styles.progressContent}>
        <View style={styles.progressRow}>
          <View style={styles.progressTextContainer}>
            <ThemedText style={styles.progressLabel}>Progress</ThemedText>
            <ThemedText style={styles.progressValue}>{Math.round(progress)}%</ThemedText>
            <ThemedText style={styles.progressSubtext}>
              {masteredWords} of {totalWords} mastered
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
    </Animated.View>
  );
}

// Memoize the entire component
export const VocabularyStats = React.memo(VocabularyStatsComponent);

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: 130,
    overflow: 'hidden',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
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
