import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { LAYOUT } from '@/constants/layout';
import { Loader, LoadingContainer } from './Loader';
import { useComponentAnimation } from '@/hooks/useComponentAnimation';
import { useProgressAnimation } from '@/hooks/useProgressAnimation';
import { createArcPath } from '@/utils/graphUtils';
import { VocabularyStats as VocabularyStatsType } from '@/types/vocabulary.types';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Using subset of properties from the VocabularyStats type for this component
interface VocabularyStatsProps
  extends Pick<VocabularyStatsType, 'totalWords' | 'dueWords' | 'masteredWords' | 'learningWords'> {
  isLoading?: boolean;
}

function VocabularyStatsComponent({
  totalWords,
  dueWords,
  masteredWords,
  learningWords,
  isLoading = false,
}: VocabularyStatsProps) {
  const colors = useColors();
  const { isReady } = useComponentAnimation();

  // Calculate progress as a percentage - protect against division by zero
  const progress = useMemo(
    () => (totalWords > 0 ? (masteredWords / totalWords) * 100 : 0),
    [totalWords, masteredWords]
  );

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
});
