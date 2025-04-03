import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '@/hooks/useColors';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { LAYOUT } from '@/constants/layout';
import { LoadingContainer } from '../Loader';
import { useComponentAnimation, useProgressAnimation } from '@/hooks/animations';
import { createArcPath } from '@/utils/graphUtils';
import { VocabularyStatsProps } from '@/types/ui/layout.types';
import BaseCard from '../BaseCard';

function VocabularyStatsComponent({
  totalWords,
  masteredWords,
  isLoading = false,
}: VocabularyStatsProps) {
  const colors = useColors();
  const { startAnimation } = useComponentAnimation();
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

  // Use the animation hook to animate the progress
  const { progress: animatedProgressValue } = useProgressAnimation(progress, 1000);
  const animatedProgress = animatedProgressValue.value;

  const circleBackgroundColor = useMemo(() => `${colors.text}10`, [colors.text]);

  // Custom loading component
  const loadingComponent = <LoadingContainer />;

  return (
    <BaseCard
      style={styles.progressCard}
      isLoading={isLoading || !isReady}
      loadingComponent={loadingComponent}
      includePressAnimation={false}
      {...{ animated: true }}
    >
      <View style={styles.progressContent}>
        <View style={styles.progressRow}>
          <View style={styles.progressTextContainer}>
            <View style={styles.labelContainer}>
              <ThemedText type="label">Progress</ThemedText>
            </View>
            <View style={styles.valueContainer}>
              <ThemedText type="heading2">{Math.round(progress)}%</ThemedText>
            </View>
            <View style={styles.subtextContainer}>
              <ThemedText type="caption" variant="subtle">
                {masteredWords} of {totalWords} mastered
              </ThemedText>
            </View>
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
    </BaseCard>
  );
}

// Memoize the entire component
export const VocabularyStats = React.memo(VocabularyStatsComponent);

const styles = StyleSheet.create({
  circleCanvas: {
    height: LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XXLARGE,
    width: LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XXLARGE,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  labelContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  progressCard: {
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.SMALL,
  },
  progressContent: {
    flex: 1,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'space-between',
  },
  progressTextContainer: {
    flex: 1,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  subtextContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  valueContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});
