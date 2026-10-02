import { Canvas, Group, Path, type SkPath } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { DailyReadingActivity, StreakPeriod } from '@/services/studyStreak';
import { roundedTopBarPath } from '@/utils/barChartPath';
import { withOpacity } from '@/utils/colorUtils';

interface StreakChartProps {
  dailyActivity: DailyReadingActivity[];
  streakPeriods: StreakPeriod[];
}

const CHART_HEIGHT = LAYOUT.CHART.HEIGHT; // 60 via constants
const BAR_HEIGHT = LAYOUT.BUTTON.HEIGHT.LARGE / 2; // ~24 via constants
const BAR_GAP = LAYOUT.CHART.BAR_GAP; // 2 via constants
const INACTIVE_STUB_HEIGHT = Math.round(BAR_HEIGHT * 0.25); // Short baseline stubs
const STAGGER_PER_BAR_MS = 30;

// Sequential single-hue ramp (warning gold) — intensity carries recency,
// geometry carries activity. No second hue, no glow.
const ACTIVE_STREAK_OPACITY = 1;
const PAST_STREAK_OPACITY = 0.55;
const ISOLATED_DAY_OPACITY = 0.35;

/** Bar with a rounded top and a square baseline — see `utils/barChartPath`. */
const buildBarPath = (x: number, width: number, height: number): SkPath =>
  roundedTopBarPath({ x, width, height, baseline: BAR_HEIGHT });

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

interface StreakBarProps {
  path: SkPath;
  color: string;
  index: number;
  animated: boolean;
}

const StreakBar = memo<StreakBarProps>(({ path, color, index, animated }) => {
  const grow = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      grow.set(withDelay(index * STAGGER_PER_BAR_MS, withSpring(1, SPRING_CONFIG.CARD)));
    }
  }, [grow, index, animated]);

  // Grow from the baseline: scaleY pivoted at the bottom of the canvas
  const transform = useDerivedValue(() => {
    'worklet';
    return [{ scaleY: grow.get() }];
  });

  return (
    <Group transform={transform} origin={{ x: 0, y: BAR_HEIGHT }}>
      <Path path={path} color={color} />
    </Group>
  );
});

StreakBar.displayName = 'StreakBar';

export const StreakChart = memo<StreakChartProps>(({ dailyActivity, streakPeriods }) => {
  const colors = useColors();

  // Memoize expensive calculations
  const chartData = useMemo(() => {
    // Calculate available width (screen width minus padding)
    const availableWidth = SCREEN_WIDTH - LAYOUT.SPACING.XLARGE * 2;

    // Calculate bar width to fit all bars without scrolling
    const calculatedBarWidth =
      (availableWidth - (dailyActivity.length - 1) * BAR_GAP) / dailyActivity.length;

    // Use calculated width, with a minimum of 6px for visibility
    const barWidth = Math.max(6, calculatedBarWidth);

    // Calculate actual chart width used
    const chartWidth = dailyActivity.length * barWidth + (dailyActivity.length - 1) * BAR_GAP;

    // Create streak map
    const streakMap = createStreakMap(streakPeriods);

    // Generate bars for each day with X positions
    const bars = dailyActivity.map((activity, index) => {
      const hasActivity = activity.hasActivity;
      const streakPeriod = streakMap.get(activity.date);
      const isInStreak = Boolean(streakPeriod);
      const isActiveStreak = streakPeriod?.isActive || false;

      // Single-hue ramp: active streak loudest, past streaks mid, isolated
      // days faint. Inactive days are short grid-colored stubs — activity
      // pops via bar height (CVD-safe), not color alone.
      let color: string;
      if (!hasActivity) {
        color = colors.chartGrid;
      } else if (isActiveStreak) {
        color = withOpacity(colors.warning, ACTIVE_STREAK_OPACITY);
      } else if (isInStreak) {
        color = withOpacity(colors.warning, PAST_STREAK_OPACITY);
      } else {
        color = withOpacity(colors.warning, ISOLATED_DAY_OPACITY);
      }

      const x = index * (barWidth + BAR_GAP);
      const height = hasActivity ? BAR_HEIGHT : INACTIVE_STUB_HEIGHT;

      return {
        key: activity.date,
        path: buildBarPath(x, barWidth, height),
        color,
        animated: hasActivity,
      };
    });

    return {
      chartWidth,
      bars,
    };
  }, [dailyActivity, streakPeriods, colors.warning, colors.chartGrid]);

  return (
    <View style={[styles.container, { height: CHART_HEIGHT }]}>
      <View style={styles.chartArea}>
        <Canvas
          style={{
            width: chartData.chartWidth,
            height: BAR_HEIGHT,
          }}
        >
          {chartData.bars.map((bar, index) => (
            <StreakBar
              key={bar.key}
              path={bar.path}
              color={bar.color}
              index={index}
              animated={bar.animated}
            />
          ))}
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
