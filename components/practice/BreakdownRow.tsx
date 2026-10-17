import type { JSX } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ListRow, ProgressBar } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui';
import { getMeterTrackColor, useChartColors } from '@/constants/chartColors';
import { INLINE_VALUE_MIN_WIDTH, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { formatCount } from '@/utils/stringUtils';

/**
 * What a breakdown row says out loud.
 *
 * One builder for both sheets. They were briefly two — one local to the horizon
 * sheet filling `{spoken}`, one in `utils/practiceDepth` filling `{hint}` — with
 * the same four parts and the same linked/empty switch expressed twice. The rule
 * about which rows are pressable is the thing most likely to change (it already
 * did, when a static `ListRow` turned out to drop its label entirely), and it
 * must not have to be changed in two places.
 *
 * `clause` is the caption as a full spoken phrase; only the caller knows whether
 * its own hint needs a verb in front of it.
 */
export function breakdownRowLabel({
  band,
  count,
  clause,
}: {
  band: string;
  count: number;
  clause: string;
}): string {
  const template = count > 0 ? STRINGS.BREAKDOWN_ROW_A11Y : STRINGS.BREAKDOWN_ROW_A11Y_EMPTY;
  return template
    .replace('{band}', band)
    .replace('{count}', String(count))
    .replace('{clause}', clause);
}

const CHEVRON_SIZE = LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE;

/**
 * Wide enough to compare bars at a glance, fixed so they share one left and one
 * right edge — a bar chart laid on its side, not four unrelated meters.
 */
const METER_WIDTH = 84;

/**
 * Keeps the counts from shunting the meters around as the row changes. Sized
 * for a grouped four-digit count: "9,999" in the 16pt semibold measures 44.5pt,
 * and at the old 40 a band of a thousand words wrapped its last digit onto a
 * second line.
 */
const COUNT_WIDTH = 48;

interface BreakdownRowProps {
  label: string;
  /** The band in plain words — there is no drawn axis in a sheet to read it off. */
  hint: string;
  count: number;
  /**
   * 0–1 against the tallest band. Omitted for rows that are not on the axis at
   * all, which is a different statement from a bar of length zero.
   */
  fraction?: number;
  /** Marks one row as the typical case, e.g. the band the median falls in. */
  tag?: string;
  /**
   * Said out loud in full, because the meter is length-only. Built by the caller:
   * each breakdown phrases its own bands, and a row cannot know whether "holds"
   * or "reviewed" belongs in front of its hint.
   */
  accessibilityLabel: string;
  /** Absent for an empty band: there is nothing on the other side of the tap. */
  onPress?: () => void;
}

/**
 * One band of a distribution, as a row: label, plain-language hint, a meter, the
 * count, and a chevron when the band leads somewhere.
 *
 * Shared by the two sheets that break a distribution down — memory horizon and
 * practice depth. It started as a private component inside the horizon sheet;
 * the second caller is what moved it here rather than copying it, so the two
 * lists cannot drift into different meter widths, different empty-row ink, or
 * different rules about which rows claim to be pressable.
 */
export function BreakdownRow({
  label,
  hint,
  count,
  fraction,
  tag,
  accessibilityLabel,
  onPress,
}: BreakdownRowProps): JSX.Element {
  const colors = useColors();
  const chartColors = useChartColors();
  const { width, fontScale } = useWindowDimensions();
  const stackMetrics = width / fontScale < INLINE_VALUE_MIN_WIDTH;

  // The same ink the practice charts draw their data in, so a row and the
  // column it came from are visibly the same data. Rows that are not on the
  // axis are not painted as if they were.
  const fillColor = fraction == null ? colors.textTertiary : chartColors.ui.dataLine;
  // `elevation1` is the sheet's own ground; the rule is `getMeterTrackColor`.
  const trackColor = getMeterTrackColor(colors.elevation1, fillColor);

  const caption = tag ? `${hint} · ${tag}` : hint;

  return (
    <ListRow divider density="compact" onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <View style={[styles.body, stackMetrics && styles.stackedBody]}>
        <View style={[styles.labelColumn, stackMetrics && styles.stackedLabel]}>
          <ThemedText type="body" colorName={count > 0 ? 'text' : 'textTertiary'}>
            {label}
          </ThemedText>
          <ThemedText type="caption" colorName="textTertiary">
            {caption}
          </ThemedText>
        </View>

        {/* A length, and only a length — the row says the count out loud beside it
          and again in its spoken label, so nothing here is carried by pixels
          alone. */}
        <View style={[styles.metrics, stackMetrics && styles.stackedMetrics]}>
          <View style={[styles.meter, stackMetrics && styles.stackedMeter]}>
            {fraction != null && (
              <ProgressBar
                backgroundColor={trackColor}
                fillColor={fillColor}
                height={LAYOUT.PROGRESS_BAR.HEIGHT}
                progress={fraction * 100}
              />
            )}
          </View>

          <ThemedText
            type="bodyBold"
            colorName={count > 0 ? 'text' : 'textTertiary'}
            style={[styles.count, { width: COUNT_WIDTH * fontScale }]}
            numberOfLines={1}
          >
            {formatCount(count)}
          </ThemedText>

          {/* Only rows that lead somewhere claim to. */}
          <View style={styles.chevron}>
            {onPress && (
              <Icon color={colors.textTertiary} name="chevron-forward" size={CHEVRON_SIZE} />
            )}
          </View>
        </View>
      </View>
    </ListRow>
  );
}

BreakdownRow.displayName = 'BreakdownRow';

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  stackedBody: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: LAYOUT.SPACING.SMALL,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  stackedMetrics: {
    alignSelf: 'stretch',
  },
  stackedMeter: {
    flex: 1,
    width: undefined,
  },
  stackedLabel: {
    flex: 0,
  },
  labelColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
  meter: {
    width: METER_WIDTH,
    flexShrink: 0,
  },
  count: {
    width: COUNT_WIDTH,
    textAlign: 'right',
  },
  chevron: {
    width: CHEVRON_SIZE,
    alignItems: 'center',
  },
});
