import { BaseCard } from '@/components/common';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { useChartColors } from '@/constants/chartColors';
import { CHART_VISUAL } from '@/constants/chartConstants';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, LETTER_SPACING, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useVocabularyGrowthChart } from '@/hooks/vocabulary/useVocabularyGrowthChart';
import type { StudyWord } from '@/types/vocabulary.types';

// Full-bleed inside the card: screen minus the tab content's 12px insets
const CHART_WIDTH = SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;
const CHART_HEIGHT = 104;

interface VocabularyProgressChartProps {
  studyWords: StudyWord[];
  onPress?: () => void;
}

/**
 * Hero progress card for the practice tab: vocabulary size as a big
 * figure with its 30-day growth drawn as a full-bleed area sparkline.
 * Growth-framed on purpose — the number only ever goes up.
 */
export const VocabularyProgressChart = memo<VocabularyProgressChartProps>(
  ({ studyWords = [], onPress }) => {
    const chartColors = useChartColors();
    const { linePath, areaPath, endPoint, totalWords, monthChange } = useVocabularyGrowthChart(
      studyWords,
      CHART_WIDTH,
      CHART_HEIGHT,
    );

    // Trim draw-in needs an SkPath — convert the SVG string once per path
    const skLinePath = useMemo(
      () => (linePath ? Skia.Path.MakeFromSVGString(linePath) : null),
      [linePath],
    );

    const progress = useSharedValue(0);
    const settleOpacity = useSharedValue(0);
    useEffect(() => {
      progress.value = 0;
      settleOpacity.value = 0;
      progress.value = withTiming(1, TIMING_CONFIG.PROGRESS);
      // Wash + endpoint dot appear once the line has finished drawing
      settleOpacity.value = withDelay(
        TIMING_CONFIG.PROGRESS.duration,
        withTiming(1, TIMING_CONFIG.ENTRANCE),
      );
    }, [progress, settleOpacity, linePath]);

    return (
      <BaseCard shadowSize="small" onPress={onPress}>
        <View style={styles.header}>
          {/* Title above the number, matching the stat tiles below (MetricCard).
              The practice screen reads top-to-bottom as label → figure on every
              card; this hero used to be the one that inverted it. */}
          <View>
            <ThemedText type="caption" colorName="subtleLabelText">
              {STRINGS.VOCABULARY_GROWTH_LABEL}
            </ThemedText>
            <ThemedText style={styles.value}>{totalWords}</ThemedText>
          </View>
          {/* A step dimmer than the card's own label: this is a supporting
              aside, not a second title. At the same weight the two captions
              read as a pair of equals competing across the header. */}
          {monthChange > 0 && (
            <ThemedText type="caption" colorName="textTertiary">
              {`+${monthChange} ${STRINGS.SUMMARY_THIS_MONTH.toLowerCase()}`}
            </ThemedText>
          )}
        </View>

        {skLinePath && (
          <Canvas style={styles.canvas} pointerEvents="none">
            <Group opacity={settleOpacity}>
              <Path path={areaPath} color={chartColors.areaWash} />
            </Group>
            <Path
              path={skLinePath}
              start={0}
              end={progress}
              color={chartColors.ui.dataLine}
              style="stroke"
              strokeWidth={CHART_VISUAL.LINE_WIDTH}
              strokeCap="round"
              strokeJoin="round"
            />
            {endPoint && (
              <Group opacity={settleOpacity}>
                <Circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r={CHART_VISUAL.DATA_POINT_EMPHASIS_SIZE + CHART_VISUAL.DATA_POINT_RING_WIDTH}
                  color={chartColors.dataPoint.inner}
                />
                <Circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r={CHART_VISUAL.DATA_POINT_EMPHASIS_SIZE}
                  color={chartColors.dataPoint.primary}
                />
              </Group>
            )}
          </Canvas>
        )}
      </BaseCard>
    );
  },
);

VocabularyProgressChart.displayName = 'VocabularyProgressChart';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.15,
    fontFamily: FONTS.ENGLISH_BOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    includeFontPadding: false,
  },
  canvas: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
