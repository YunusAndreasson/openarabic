import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Ionicons } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { DueWordsForecast } from '@/utils/fsrsUtils';

import { formatWordCount } from '@/utils/wordCountText';

import { WeekAheadBars } from './charts/WeekAheadBars';

interface WeekAheadCardProps {
  /** Seven days of due counts, today first. */
  forecast: DueWordsForecast[];
  /** Due count the CTA acts on — capped, so both say the same thing. */
  dueCount: number;
  /** True when the due query clipped, so the count renders as "N+". */
  dueCountCapped: boolean;
  /** Unique words whose last review was today. */
  reviewedToday: number;
  onPress?: () => void;
}

/**
 * Today's workload, with the shape of the week beside it.
 *
 * A slim row on purpose. This began as a full card — headline, seven labelled
 * columns, a slipping warning underneath — and on device it competed with the
 * constellation above it for the same attention, on a screen that already ends
 * in a "Review N words" button. The home screen answers *how much do I know*;
 * how that workload is distributed across the week, which day peaks, and how
 * many words slip is detail, and detail belongs one tap away in the /due-words
 * and /memory-retention sheets that already draw it properly.
 *
 * What survives here is the glance: the number the CTA acts on, and a shape that
 * says whether the week is flat, spiky or clearing.
 */
export function WeekAheadCard({
  forecast,
  dueCount,
  dueCountCapped,
  reviewedToday,
  onPress,
}: WeekAheadCardProps): JSX.Element {
  const colors = useColors();

  const counts = forecast.map(day => day.dueWords);

  // The same capping rule the pinned CTA uses. The bars come from the uncapped
  // forecast over the full word list while this number comes from the clipped
  // due query, so without the "+" the row could read "137" above a button
  // offering "Review 100+ words".
  const displayCount = dueCountCapped ? `${dueCount}+` : `${dueCount}`;
  const headline =
    dueCount > 0 ? `${displayCount} ${STRINGS.TODAY_TO_REVIEW}` : STRINGS.TODAY_ALL_CAUGHT_UP;

  const peak = counts.reduce((max, count) => Math.max(max, count), 0);
  const accessibilityLabel = STRINGS.WEEK_AHEAD_A11Y.replace('{today}', displayCount).replace(
    '{peak}',
    String(peak),
  );

  return (
    <BaseCard onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {headline}
          </ThemedText>
          {reviewedToday > 0 && (
            <ThemedText type="caption" colorName="secondaryText" numberOfLines={1}>
              {STRINGS.TODAY_REVIEWED_TODAY.replace('{words}', formatWordCount(reviewedToday))}
            </ThemedText>
          )}
        </View>

        {/* One drawing, read through the row's own label — never as seven loose
            weekday fragments inside the button. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <WeekAheadBars counts={counts} />
        </View>

        {/* Same guard as every other disclosure: `onPress` is optional, and a
            chevron on a card that does not navigate is a promise it cannot keep. */}
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
            color={colors.textTertiary}
          />
        )}
      </View>
    </BaseCard>
  );
}

WeekAheadCard.displayName = 'WeekAheadCard';

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  textColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.HALF_TINY,
  },
});
