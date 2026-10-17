import { BaseCard } from '@/components/common';
import { Canvas, Circle, Group, Path, Skia } from 'react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
import { useChartColors } from '@/constants/chartColors';
import { CHART_VISUAL } from '@/constants/chartConstants';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, LETTER_SPACING } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useVocabularyGrowthChart } from '@/hooks/vocabulary/useVocabularyGrowthChart';
import type { StudyWord } from '@/types/vocabulary.types';
import { formatCount } from '@/utils/stringUtils';

/**
 * Half the card width, minus its padding and the label column beside it. The
 * chart is now an aside rather than a hero, so it is sized to the space left
 * over by the number it accompanies.
 */
const LABEL_COLUMN_WIDTH = 120;
/** Everything in the card's row that is not the chart. */
const CHART_WIDTH_INSET =
  LAYOUT.SCREEN_HORIZONTAL_PADDING * 2 +
  LABEL_COLUMN_WIDTH +
  LAYOUT.SPACING.LARGE * 2 +
  LAYOUT.SPACING.MEDIUM;
const CHART_HEIGHT = 44;

interface VocabularyProgressChartProps {
  studyWords: StudyWord[];
  onPress?: () => void;
}

/**
 * Vocabulary size and its 30-day growth, as a trend tile.
 *
 * It used to lead the practice screen at 183pt tall. It was demoted, not
 * deleted, and the reasoning is worth keeping: this is the ONE honest historical
 * series the app has — `created_at` is the only timestamp that is never
 * overwritten — so it deserves a place. But it contains no FSRS data at all, it
 * can only ever rise, and a screen that opens on it rewards *adding* words,
 * which argues with the app's own intake pacing. The memory constellation leads
 * now; this closes.
 */
export const VocabularyProgressChart = memo<VocabularyProgressChartProps>(
  ({ studyWords = [], onPress }) => {
    const chartColors = useChartColors();
    // From the live window: an Android 16 tablet or foldable resizes under a
    // running app, and a launch-time width would leave the chart stranded.
    const chartWidth = useWindowDimensions().width - CHART_WIDTH_INSET;
    const { linePath, areaPath, endPoint, totalWords, monthChange } = useVocabularyGrowthChart(
      studyWords,
      chartWidth,
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
      progress.set(0);
      settleOpacity.set(0);
      // Last of the three charts to arrive, so the screen resolves top-to-bottom.
      progress.set(withDelay(TIMING_CONSTANTS.STAGGER.FAST, withTiming(1, TIMING_CONFIG.PROGRESS)));
      // Wash + endpoint dot appear once the line has finished drawing
      settleOpacity.set(
        withDelay(
          TIMING_CONSTANTS.STAGGER.FAST + TIMING_CONFIG.PROGRESS.duration,
          withTiming(1, TIMING_CONFIG.ENTRANCE),
        ),
      );
    }, [progress, settleOpacity, linePath]);

    return (
      <BaseCard
        onPress={onPress}
        accessibilityLabel={(onPress
          ? STRINGS.VOCABULARY_GROWTH_A11Y_LINK
          : STRINGS.VOCABULARY_GROWTH_A11Y
        ).replace('{count}', String(totalWords))}
      >
        <View style={styles.row}>
          <View style={styles.labelColumn}>
            <ThemedText type="caption" colorName="subtleLabelText">
              {STRINGS.VOCABULARY_GROWTH_LABEL}
            </ThemedText>
            <ThemedText style={styles.value}>{formatCount(totalWords)}</ThemedText>
          </View>

          <View
            style={styles.chartColumn}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {skLinePath && (
              <Canvas style={[styles.canvas, { width: chartWidth }]} pointerEvents="none">
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
            {/* `< totalWords`: on a new account every word was added this month,
                so the delta is the total restated one line below itself. A
                change is only news when something came before it. */}
            {monthChange > 0 && monthChange < totalWords && (
              <ThemedText type="caption" colorName="textTertiary" style={styles.delta}>
                {`+${monthChange} ${STRINGS.SUMMARY_THIS_MONTH.toLowerCase()}`}
              </ThemedText>
            )}
          </View>
        </View>
      </BaseCard>
    );
  },
);

VocabularyProgressChart.displayName = 'VocabularyProgressChart';

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  labelColumn: {
    width: LABEL_COLUMN_WIDTH,
  },
  chartColumn: {
    alignItems: 'flex-end',
    flex: 1,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    includeFontPadding: false,
  },
  canvas: {
    height: CHART_HEIGHT,
  },
  delta: {
    marginTop: LAYOUT.SPACING.TINY,
  },
});
