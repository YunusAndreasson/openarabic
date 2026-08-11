import { Canvas, Circle, DashPathEffect, Line, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CHART_OPACITY, getChartColors } from '@/constants/chartColors';
import { CHART_VISUAL } from '@/constants/chartConstants';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { MemoryCurve } from '@/hooks/vocabulary/useWordMemory';

/** Plot height. Tall enough for the decay to have a shape, short enough to stay a detail. */
const PLOT_HEIGHT = 76;

/**
 * Room for the 2px stroke and the marker dots at the extremes, so a curve that
 * starts at 100% and a dot that lands on the right edge are not half-clipped.
 */
const VERTICAL_INSET = CHART_VISUAL.DATA_POINT_EMPHASIS_SIZE + CHART_VISUAL.DATA_POINT_RING_WIDTH;
const RIGHT_INSET = VERTICAL_INSET;

const NOW_DOT_RADIUS = CHART_VISUAL.DATA_POINT_EMPHASIS_SIZE;
const DUE_DOT_RADIUS = CHART_VISUAL.DATA_POINT_SIZE + 1;
const DASH_INTERVAL = [3, 4];

interface WordMemoryCurveProps {
  curve: MemoryCurve;
  /** Announced in place of the drawing, which a screen reader cannot read. */
  accessibilityLabel: string;
  width?: number;
}

/**
 * This one word's forgetting curve: how its predicted recall decays from the last
 * review, where today sits on that decay, and where the next review is scheduled.
 *
 * The panel's whole argument is here. Every other figure on the screen states a
 * value; this states the *model* — why the word is due when it is due — which is
 * the one thing an adjective can never do.
 *
 * Deliberately not built on the shared `VocabularyChart` stack: those components
 * all take `studyWords: StudyWord[]` and are aggregate, week-bucketed charts with
 * a card shell, axes and tooltips. This is one continuous function over a domain
 * measured in a single word's days, so it draws itself, following
 * MemoryRetentionGauge's precedent — build the paths once, hand them to Skia.
 */
export const WordMemoryCurve = memo<WordMemoryCurveProps>(
  ({ curve, accessibilityLabel, width }) => {
    const colors = useColors();
    const chartColors = getChartColors(colors);

    const plotWidth = width ?? SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;

    const geometry = useMemo(() => {
      const { points, spanDays, floorRetrievability } = curve;
      const usableWidth = Math.max(1, plotWidth - RIGHT_INSET);
      const usableHeight = Math.max(1, PLOT_HEIGHT - VERTICAL_INSET * 2);
      const range = Math.max(Number.MIN_VALUE, 1 - floorRetrievability);

      const toX = (days: number): number => usableWidth * Math.min(1, Math.max(0, days / spanDays));

      // The axis bottoms out at the "poor retention" mark rather than at zero:
      // between the last review and the scheduled one, recall only falls from
      // 100% to 90%, so a 0–100 axis would render the whole story as a flat line.
      const toY = (retrievability: number): number => {
        const normalized = (retrievability - floorRetrievability) / range;
        return VERTICAL_INSET + usableHeight * (1 - Math.min(1, Math.max(0, normalized)));
      };

      const line = Skia.Path.Make();
      points.forEach((point, index) => {
        const x = toX(point.days);
        const y = toY(point.retrievability);
        if (index === 0) line.moveTo(x, y);
        else line.lineTo(x, y);
      });

      // Same outline closed down to the baseline for the wash beneath it.
      const area = line.copy();
      area.lineTo(toX(spanDays), PLOT_HEIGHT);
      area.lineTo(0, PLOT_HEIGHT);
      area.close();

      const at = (days: number): { x: number; y: number } => {
        const clamped = Math.min(spanDays, Math.max(0, days));
        // Read the curve we drew rather than recomputing it, so a marker can
        // never sit fractionally off the line it is meant to be on.
        const index = Math.round(((points.length - 1) * clamped) / spanDays);
        const point = points[Math.min(points.length - 1, Math.max(0, index))];
        return { x: toX(clamped), y: toY(point?.retrievability ?? 0) };
      };

      return {
        line,
        area,
        targetY: toY(curve.targetRetrievability),
        now: at(curve.nowDays),
        due: curve.dueDays == null ? null : at(curve.dueDays),
      };
    }, [curve, plotWidth]);

    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={styles.container}
      >
        <Canvas style={{ width: plotWidth, height: PLOT_HEIGHT }}>
          <Path color={chartColors.areaWash} path={geometry.area} style="fill" />

          {/* The scheduler's target recall. Dashed so it reads as a rule rather
              than as a second series. */}
          <Line
            color={chartColors.ui.threshold}
            p1={{ x: 0, y: geometry.targetY }}
            p2={{ x: plotWidth, y: geometry.targetY }}
            strokeWidth={StyleSheet.hairlineWidth}
            style="stroke"
          >
            <DashPathEffect intervals={DASH_INTERVAL} />
          </Line>

          {geometry.due && (
            <>
              <Line
                color={chartColors.withOpacity(chartColors.ui.accent, CHART_OPACITY.LOW)}
                p1={{ x: geometry.due.x, y: geometry.due.y }}
                p2={{ x: geometry.due.x, y: PLOT_HEIGHT }}
                strokeWidth={StyleSheet.hairlineWidth}
                style="stroke"
              />
              <Circle
                color={chartColors.ui.accent}
                cx={geometry.due.x}
                cy={geometry.due.y}
                r={DUE_DOT_RADIUS}
                strokeWidth={CHART_VISUAL.DATA_POINT_RING_WIDTH}
                style="stroke"
              />
            </>
          )}

          <Path
            color={chartColors.ui.dataLine}
            path={geometry.line}
            strokeCap="round"
            strokeJoin="round"
            strokeWidth={CHART_VISUAL.LINE_WIDTH}
            style="stroke"
          />

          {/* Now, last, so it sits on top of the line it marks. The surface ring
              keeps it legible where the curve passes underneath. */}
          <Circle
            color={chartColors.dataPoint.inner}
            cx={geometry.now.x}
            cy={geometry.now.y}
            r={NOW_DOT_RADIUS + CHART_VISUAL.DATA_POINT_RING_WIDTH}
          />
          <Circle
            color={chartColors.dataPoint.primary}
            cx={geometry.now.x}
            cy={geometry.now.y}
            r={NOW_DOT_RADIUS}
          />
        </Canvas>
      </View>
    );
  },
);

WordMemoryCurve.displayName = 'WordMemoryCurve';

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
