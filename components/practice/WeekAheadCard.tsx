import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCount, BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, LETTER_SPACING } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { formatDueCount, isDueCountCapped } from '@/utils/dueCountText';
import type { DueWordsForecast } from '@/utils/fsrsUtils';
import { formatWordCount } from '@/utils/wordCountText';

import { WeekAheadBars } from './charts/WeekAheadBars';

interface WeekAheadCardProps {
  /** Seven days of due counts, today first. */
  forecast: DueWordsForecast[];
  /** The due count the tab badge shows and the Review action works through. */
  dueCount: number;
  /** Unique words whose last review was today. */
  reviewedToday: number;
  onPress?: () => void;
}

/**
 * What is due today, with the shape of the week beside it. The practice
 * screen's lead card.
 *
 * It leads because the tab badge points here. The badge puts a number on the
 * icon, and for a while the screen it opened answered with that number in body
 * type inside a sentence ("23 to review today"), in a slim second row under a
 * 32pt recall figure — the one number the learner arrived looking for was the
 * smallest on the screen. Now it is the first thing under the header's Review
 * action, labelled, and the largest numeral on the screen: the recall card below
 * uses the same label-over-numeral grammar one size down.
 *
 * The detail is still one tap away: which day peaks and how many words slip are
 * drawn properly in the /due-words sheet this opens.
 */
export function WeekAheadCard({
  forecast,
  dueCount,
  reviewedToday,
  onPress,
}: WeekAheadCardProps): JSX.Element {
  const colors = useColors();

  const counts = forecast.map(day => day.dueWords);

  // The same spelling the tab badge uses. The bars come from the uncapped
  // forecast over the full word list while this number comes from the clipped
  // due query, so without the "+" the card could read "100" beside a week whose
  // first bar says otherwise.
  const displayCount = formatDueCount(dueCount);
  const isCapped = isDueCountCapped(dueCount);

  // Let the summary wrap at large text sizes so the effort count stays readable.
  const reviewedLine =
    reviewedToday > 0
      ? STRINGS.TODAY_REVIEWED_TODAY.replace('{words}', formatWordCount(reviewedToday))
      : null;
  const footer =
    dueCount > 0
      ? (reviewedLine ?? STRINGS.TODAY_NOTHING_REVIEWED)
      : [STRINGS.TODAY_ALL_CAUGHT_UP, reviewedLine].filter(Boolean).join(' · ');

  const peak = counts.reduce((max, count) => Math.max(max, count), 0);
  const accessibilityLabel = STRINGS.WEEK_AHEAD_A11Y.replace('{today}', displayCount).replace(
    '{peak}',
    String(peak),
  );

  return (
    <BaseCard onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <View style={styles.body}>
        <ThemedText type="caption" colorName="subtleLabelText">
          {STRINGS.DUE_TODAY_LABEL}
        </ThemedText>

        <View style={styles.valueRow}>
          {/* A count past the fetch limit is a floor, not a total: it is set as
              static text because there is no exact value to count up to. */}
          {isCapped ? (
            <ThemedText
              type="heading1"
              style={styles.value}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {displayCount}
            </ThemedText>
          ) : (
            // The card announces the whole story in one sentence; a second
            // reading of the bare number would only repeat part of it.
            <AnimatedCount value={dueCount} style={styles.value} silent />
          )}

          {/* One drawing, read through the card's own label — never as seven
              loose weekday fragments inside the button. */}
          <View
            style={styles.bars}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <WeekAheadBars counts={counts} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText type="caption" colorName="captionText" style={styles.footerText}>
          {footer}
        </ThemedText>
        {/* Same guard as every other disclosure: `onPress` is optional, and a
            chevron on a card that does not navigate is a promise it cannot keep. */}
        {onPress && (
          <Icon
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

// Padding and footer match `MemoryHorizonCard`, which sits directly below: the
// two cards share a left edge, a label line and a chevron column.
const styles = StyleSheet.create({
  body: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  valueRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'space-between',
  },
  // The screen's one headline numeral. Everything else steps down from it:
  // the recall count is `heading2`, the habit tiles smaller again.
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.15,
    fontFamily: FONTS.ENGLISH_BOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    includeFontPadding: false,
  },
  // Lifts the bars' baseline onto the numeral's, which sits above the bottom of
  // its own line box. Measured on device: at a full SMALL the bars floated 2dp
  // above the digits.
  bars: {
    paddingBottom: LAYOUT.SPACING.SMALL - LAYOUT.SPACING.HALF_TINY,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  footerText: {
    flex: 1,
  },
});
