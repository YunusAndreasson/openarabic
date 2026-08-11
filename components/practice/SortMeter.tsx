import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/common';
import { CHART_OPACITY } from '@/constants/chartColors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { SolidColorName } from '@/constants/colors';
import { mixColors } from '@/utils/colorUtils';

/** Fixed width so every meter in a list shares one right edge and one scale. */
const METER_WIDTH = 32;

interface SortMeterProps {
  /** 0–1, from `getSortMeterFraction` — whichever magnitude the list is sorted by. */
  fraction: number;
  /** Theme key from `getSortMeterColorName` — where the word stands on that magnitude. */
  colorName: SolidColorName;
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
 * Length AND colour, on one element: length is the raw magnitude, colour is
 * where the word stands on it (`getSortMeterColorName`). They reinforce rather
 * than compete — a long red bar is a hard word, saying one thing twice.
 *
 * This comment used to read "length, not colour", because a difficulty dot led
 * the row and a coloured meter beside it would have been the second traffic
 * light that makes an ordinary word look like an error. Removing the dot freed
 * the colour channel, and encoding valence here is what let length go back to
 * mapping its variable directly instead of being inverted to carry judgement.
 */
export const SortMeter = memo<SortMeterProps>(({ fraction, colorName, animated = false }) => {
  const colors = useColors();
  const fillColor = colors[colorName];

  // The chart system's meter rule: the track is a lighter step of the fill's own
  // hue, never grey. Mixed rather than alpha-blended — an alpha wash composites
  // against the page, and on the dark theme that is near-black, so any hue at
  // this weight would collapse into the background instead of reading as a track.
  const trackColor = mixColors(colors.elevation2, fillColor, CHART_OPACITY.TRACK);

  return (
    <View style={styles.container}>
      <ProgressBar
        animationDuration={animated ? undefined : 0}
        backgroundColor={trackColor}
        fillColor={fillColor}
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
