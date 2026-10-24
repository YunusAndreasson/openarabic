import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCount, BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useTextLayout } from '@/hooks/ui/useTextLayout';
import type { MemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { getHorizonBandsAccessibilityLabel } from '@/utils/memoryHorizon';
import { formatCount } from '@/utils/stringUtils';

import { MemoryHorizonBand } from './charts/MemoryHorizonBand';
import { PracticeCardBody, PracticeCardFooter } from './PracticeSummaryCard';

interface MemoryHorizonCardProps {
  /** Expected words recallable right now — Σ of every measured word's recall. */
  recallableWords: number;
  /** False until something has actually been reviewed. */
  hasMeasuredMemory: boolean;
  distribution: MemoryHorizonDistribution;
  onPress?: () => void;
}

/**
 * What the learner can recall right now, and how deeply it sits.
 *
 * Second on the practice screen, under the due count. It led the screen until
 * the tab badge made the case against that: the badge promises a number, and
 * the first card a learner met answered a different question.
 *
 * This replaced a card that led with "Words in practice" — an inventory number
 * over a line built from `created_at` that contained no FSRS data at all, could
 * only ever rise, and rewarded ADDING words, which argues with the app's own
 * intake pacing. What is here instead is exact, forward-looking, and moves when
 * the learner reviews.
 */
export function MemoryHorizonCard({
  recallableWords,
  hasMeasuredMemory,
  distribution,
  onPress,
}: MemoryHorizonCardProps): JSX.Element {
  const { crowded: stackHeadline } = useTextLayout();
  const { bands, medianLabel, medianFraction, practisedCount, hasDistribution } = distribution;

  // The dot scale, whenever a dot stops meaning one word. A unit chart whose dot
  // has quietly started standing for four words tells "count the dots" as a
  // false instruction, and above about twenty words in one column — an ordinary
  // collection — that is every learner's chart. It used to be spoken only (the
  // comment here claimed the memory sheet showed it too; that sheet lists bands
  // and has no dots to scale), so a sighted learner was never told. It now rides
  // at the end of the footer caption under the drawing it qualifies, and in the
  // spoken label. The slipping and not-started counts still stay off this card:
  // it answers "how much do I know, and how deep is it".
  const dotScale =
    distribution.wordsPerDot > 1
      ? STRINGS.PRACTICE_DOT_SCALE.replace('{count}', String(distribution.wordsPerDot))
      : null;
  const dotScaleNote = dotScale ? ` ${dotScale}.` : '';

  const footer = hasDistribution
    ? [STRINGS.PRACTICE_TYPICAL_HORIZON.replace('{horizon}', medianLabel), dotScale]
        .filter(Boolean)
        .join(' · ')
    : STRINGS.PRACTICE_RECALL_EMPTY;

  const accessibilityLabel = hasMeasuredMemory
    ? STRINGS.HORIZON_BAND_A11Y.replace('{recall}', String(recallableWords))
        .replace('{total}', String(practisedCount))
        .replace('{breakdown}', getHorizonBandsAccessibilityLabel(bands)) + dotScaleNote
    : STRINGS.HORIZON_BAND_A11Y_EMPTY;

  return (
    <BaseCard onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <PracticeCardBody>
        <ThemedText type="caption" colorName="subtleLabelText">
          {STRINGS.PRACTICE_RECALL_NOW_LABEL}
        </ThemedText>

        <View style={[styles.headline, stackHeadline && styles.stackedHeadline]}>
          <AnimatedCount
            value={recallableWords}
            // Nothing practised is not a measurement of zero. "0" here would
            // tell someone who has just built a word list that they would
            // remember none of it.
            placeholder={hasMeasuredMemory ? undefined : STRINGS.EMPTY_METRIC}
            // One step below the due count above it. At the same 32pt this card
            // also had the chart, so it outweighed the number the screen leads
            // with and the two read as rival headlines.
            type="heading2"
            style={styles.value}
            // The card announces the whole story in one sentence; a second
            // reading of the bare number would only repeat part of it.
            silent
          />
          {hasMeasuredMemory && (
            <ThemedText type="caption" colorName="textTertiary" style={styles.denominator}>
              {STRINGS.PRACTICE_RECALL_OF_TOTAL.replace('{total}', formatCount(practisedCount))}
            </ThemedText>
          )}
        </View>
      </PracticeCardBody>

      {/* Canvas + its axis labels are one drawing, so they are hidden from the
          accessibility tree wholesale. Without this, VoiceOver reads the four
          axis captions as orphan fragments — "Days", "Weeks", "Months",
          "A year+" — inside the button. */}
      <View
        style={styles.band}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MemoryHorizonBand
          bins={distribution.bins}
          wordsPerDot={distribution.wordsPerDot}
          medianFraction={medianFraction}
          hasDistribution={hasDistribution}
          horizonByRootId={distribution.horizonByRootId}
        />
      </View>

      {/* The footer and chevron share one row; the text can wrap as it grows.
          Same signifier, same ink and the same right edge as the due card above
          it — this card was the largest tappable surface on the screen with
          nothing to say it was one. The chevron is guarded on `onPress`, exactly
          as `MetricCard` and `BreakdownRow` guard theirs: `onPress` is optional
          here, so an unguarded chevron would make a STATIC card advertise a
          destination it does not have — the mirror image of the tile that
          swallowed a press. */}
      <PracticeCardFooter text={footer} showDisclosure={onPress != null} />
    </BaseCard>
  );
}

MemoryHorizonCard.displayName = 'MemoryHorizonCard';

const styles = StyleSheet.create({
  headline: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  value: {
    includeFontPadding: false,
  },
  denominator: {
    flexShrink: 1,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  stackedHeadline: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: LAYOUT.SPACING.TINY,
  },
  // Full-bleed: the canvas is exactly the card's own width, so it must not sit
  // inside horizontal padding or it overflows the rounded corners.
  band: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
