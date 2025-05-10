import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import React, { useMemo, useState, memo, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useComponentAnimation, useProgressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import type { VocabularyStatsProps } from '@/types/ui/layout.types';
import { createArcPath } from '@/utils/graphUtils';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

const CIRCLE_RADIUS = 32;
const CIRCLE_STROKE_WIDTH = 6;
const CIRCLE_CENTER = 40;
const ANIMATION_DELAY = 400;
const PROGRESS_ANIMATION_DURATION = 1000;

function VocabularyStatsComponent({
  totalWords,
  masteredWords,
  isLoading = false,
}: VocabularyStatsProps) {
  const colors = useColors();
  const { startAnimation } = useComponentAnimation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    startAnimation();
    const timer = setTimeout(() => {
      setIsReady(true);
    }, ANIMATION_DELAY);

    return () => clearTimeout(timer);
  }, [startAnimation]);

  const progress = useMemo(
    () => (totalWords > 0 ? (masteredWords / totalWords) * 100 : 0),
    [totalWords, masteredWords]
  );

  const { progress: animatedProgressValue } = useProgressAnimation(
    progress,
    PROGRESS_ANIMATION_DURATION
  );
  const animatedProgress = animatedProgressValue.value;

  const circleBackgroundColor = useMemo(() => colors.text + '1a', [colors.text]);

  if (isLoading) {
    return (
      <BaseCard
        style={styles.progressCard}
        isLoading={true}
        loadingComponent={<ActivityIndicator size="large" color={colors.tint} />}
        includePressAnimation={false}
      >
        <View />
      </BaseCard>
    );
  }

  return (
    <BaseCard
      style={styles.progressCard}
      isLoading={!isReady}
      loadingComponent={<ActivityIndicator size="large" color={colors.tint} />}
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

          <View style={styles.circleContainer}>
            <Canvas style={styles.circleCanvas}>
              <Circle
                cx={CIRCLE_CENTER}
                cy={CIRCLE_CENTER}
                r={CIRCLE_RADIUS}
                color={circleBackgroundColor}
                style="stroke"
                strokeWidth={CIRCLE_STROKE_WIDTH}
              />

              <Path
                path={createArcPath(animatedProgress, CIRCLE_RADIUS)}
                color={colors.text}
                style="stroke"
                strokeWidth={CIRCLE_STROKE_WIDTH}
                transform={[{ translateX: 8 }, { translateY: 8 }]}
              />

              <Circle cx={CIRCLE_CENTER} cy={CIRCLE_CENTER} r={3} color={colors.text} />
            </Canvas>
          </View>
        </View>
      </View>
    </BaseCard>
  );
}

export const VocabularyStats = memo(VocabularyStatsComponent);

const CIRCLE_SIZE = LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XXLARGE;
const CARD_HEIGHT = LAYOUT.BUTTON.HEIGHT.LARGE * 2 + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.SMALL;

const styles = StyleSheet.create({
  circleCanvas: {
    height: CIRCLE_SIZE,
    width: CIRCLE_SIZE,
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
    height: CARD_HEIGHT,
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
