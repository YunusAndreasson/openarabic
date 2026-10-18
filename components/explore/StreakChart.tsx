import { Canvas, Group, Path, Skia, vec } from 'react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { CHART_OPACITY, useChartColors } from '@/constants/chartColors';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { DailyReadingActivity, StreakPeriod } from '@/services/studyStreak';
import { appendRoundedTopBar } from '@/utils/barChartPath';
import { withOpacity } from '@/utils/colorUtils';

interface StreakChartProps {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
}

const CHART_HEIGHT = LAYOUT.CHART.HEIGHT; // 60 via constants
const BAR_HEIGHT = LAYOUT.BUTTON.HEIGHT.LARGE / 2; // ~24 via constants
const BAR_GAP = LAYOUT.CHART.BAR_GAP; // 2 via constants
const INACTIVE_STUB_HEIGHT = Math.round(BAR_HEIGHT * 0.25); // Short baseline stubs
const GROW_ORIGIN = vec(0, BAR_HEIGHT);

// Extract expensive calculations outside component
const createStreakMap = (streakPeriods: StreakPeriod[]): Map<string, StreakPeriod> => {
  const map = new Map<string, StreakPeriod>();
  streakPeriods.forEach(period => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    // Mark all dates in this period using UTC for consistent timezone handling
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .split('T')[0];
      if (dateStr) {
        map.set(dateStr, period);
      }
    }
  });
  return map;
};

/**
 * One bar per day for the last 40 days: a practised day is a full bar, a day
 * without practice a short stub on the baseline.
 *
 * Two levels of the one chart accent, the same distinction the week-ahead bars
 * draw: the current run solid, every other practised day muted. It used to be
 * painted in `warning` gold — a status colour, reserved for meaning, on a habit
 * chart where nothing was wrong — at three opacities (current run, past runs,
 * isolated days) with nothing on screen saying which was which. The sheet's
 * closing caption is the legend for the solid run, and only appears when there
 * is one.
 *
 * The bars grow in as one group off the baseline. They used to spring in one at
 * a time on a 30 ms stagger, a forty-bar cascade that took well over a second to
 * say "here are some days".
 */
export const StreakChart = memo<StreakChartProps>(({ dailyActivity, streakPeriods }) => {
  const chartColors = useChartColors();
  const { width: windowWidth } = useWindowDimensions();

  // Memoize expensive calculations
  const chartData = useMemo(() => {
    // Calculate available width (window width minus padding)
    const availableWidth = windowWidth - LAYOUT.SPACING.XLARGE * 2;

    // Calculate bar width to fit all bars without scrolling
    const calculatedBarWidth =
      (availableWidth - (dailyActivity.length - 1) * BAR_GAP) / dailyActivity.length;

    // Use calculated width, with a minimum of 6px for visibility
    const barWidth = Math.max(6, calculatedBarWidth);

    // Calculate actual chart width used
    const chartWidth = dailyActivity.length * barWidth + (dailyActivity.length - 1) * BAR_GAP;

    const streakMap = createStreakMap(streakPeriods);

    // Three paths, one per ink: the stubs, the muted practised days, the run.
    const stubs = Skia.PathBuilder.Make();
    const practised = Skia.PathBuilder.Make();
    const currentRun = Skia.PathBuilder.Make();

    dailyActivity.forEach((activity, index) => {
      const x = index * (barWidth + BAR_GAP);
      if (!activity.hasActivity) {
        appendRoundedTopBar(stubs, {
          x,
          width: barWidth,
          height: INACTIVE_STUB_HEIGHT,
          baseline: BAR_HEIGHT,
        });
        return;
      }
      const isCurrentRun = streakMap.get(activity.date)?.isActive === true;
      appendRoundedTopBar(isCurrentRun ? currentRun : practised, {
        x,
        width: barWidth,
        height: BAR_HEIGHT,
        baseline: BAR_HEIGHT,
      });
    });

    return {
      chartWidth,
      stubs: stubs.build(),
      practised: practised.build(),
      currentRun: currentRun.build(),
    };
  }, [dailyActivity, streakPeriods, windowWidth]);

  // Grow the practised days off the baseline as one transform.
  const growth = useSharedValue(0);
  useEffect(() => {
    growth.set(0);
    growth.set(withTiming(1, TIMING_CONFIG.PROGRESS));
  }, [growth, chartData]);

  const growTransform = useDerivedValue(() => {
    'worklet';
    return [{ scaleY: growth.get() }];
  });

  return (
    <View style={[styles.container, { height: CHART_HEIGHT }]}>
      <View style={styles.chartArea}>
        <Canvas
          style={{
            width: chartData.chartWidth,
            height: BAR_HEIGHT,
          }}
        >
          {/* Days without practice: static grid-ink stubs, so the absence of a
              bar is drawn rather than left as a gap. */}
          <Path path={chartData.stubs} color={chartColors.ui.grid} />
          <Group transform={growTransform} origin={GROW_ORIGIN}>
            <Path
              path={chartData.practised}
              color={withOpacity(chartColors.ui.dataLine, CHART_OPACITY.MEDIUM)}
            />
            <Path path={chartData.currentRun} color={chartColors.ui.dataLine} />
          </Group>
        </Canvas>
        <View style={[styles.axisRow, { width: chartData.chartWidth }]}>
          <ThemedText type="caption" colorName="subtleLabelText" style={styles.axisLabel}>
            {STRINGS.STREAK_CHART_START_LABEL}
          </ThemedText>
          <ThemedText type="caption" colorName="subtleLabelText" style={styles.axisLabel}>
            {STRINGS.STREAK_CHART_TODAY_LABEL}
          </ThemedText>
        </View>
      </View>
    </View>
  );
});

StreakChart.displayName = 'StreakChart';

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
  },
  chartArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.TINY,
  },
  axisLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
  },
});
