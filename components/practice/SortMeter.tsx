import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/common';
import { CHART_OPACITY } from '@/constants/chartColors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { mixColors } from '@/utils/colorUtils';

/** Fixed width so every meter in a list shares one right edge and one scale. */
const METER_WIDTH = 32;

interface SortMeterProps {
  /** 0–1, from `getSortMeterFraction` — whichever magnitude the list is sorted by. */
  fraction: number;
  /**
   * Animate width changes. Off inside a recycled list row: FlashList hands the
   * row a different word, and an animated meter would slide from the previous
   * word's length to the new one every time you flick past it.
   */
  animated?: boolean;
}

/**
 * The magnitude the list is currently sorted by, as a length.
 *
 * Whatever the active sort measures, this draws — see `getSortMeterFraction`.
 * That binding is the point: the bar was previously fixed to the memory horizon
 * while the list offered three orderings, and since nothing on screen named it,
 * two of the three sorts left it looking arbitrary. Tying it to the sort makes
 * the control directly above the list act as the bar's label.
 *
 * Length, not colour. The dot beside it is already red/amber/green, and a second
 * traffic light in the same row makes an ordinary word look like an error — the
 * exact failure that got a three-column stat block deleted from the word detail
 * screen. Different variable, different visual attribute.
 */
export const SortMeter = memo<SortMeterProps>(({ fraction, animated = false }) => {
  const colors = useColors();

  // The chart system's meter rule: the track is a lighter step of the fill's own
  // hue, never grey. Mixed rather than alpha-blended — an alpha wash composites
  // against the page, and on the dark theme that is near-black, so any hue at
  // this weight would collapse into the background instead of reading as a track.
  const trackColor = mixColors(colors.elevation2, colors.chartAccent, CHART_OPACITY.TRACK);

  return (
    <View style={styles.container}>
      <ProgressBar
        animationDuration={animated ? undefined : 0}
        backgroundColor={trackColor}
        fillColor={colors.chartAccent}
        height={LAYOUT.PROGRESS_BAR.HEIGHT}
        progress={fraction * 100}
      />
    </View>
  );
});

SortMeter.displayName = 'SortMeter';

const styles = StyleSheet.create({
  container: {
    width: METER_WIDTH,
    flexShrink: 0,
  },
});
