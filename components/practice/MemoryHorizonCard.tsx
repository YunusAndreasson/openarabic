import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCount, BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, LETTER_SPACING } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { MemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { getHorizonBandsAccessibilityLabel } from '@/utils/memoryHorizon';

import { MemoryHorizonBand } from './charts/MemoryHorizonBand';

interface MemoryHorizonCardProps {
  /** Expected words recallable right now — Σ of every measured word's recall. */
  recallableWords: number;
  /** False until something has actually been reviewed. */
  hasMeasuredMemory: boolean;
  distribution: MemoryHorizonDistribution;
  onPress?: () => void;
}

/**
 * The practice screen's hero: what the learner can recall right now, and how
 * deeply it sits.
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
  const { bands, medianLabel, medianFraction, practisedCount, hasDistribution } = distribution;

  // The dot scale is a real caveat — a unit chart whose dot has quietly stopped
  // meaning one word overstates itself — but it is a FOOTNOTE, not headline
  // content. It rides in the spoken label and in the memory sheet rather than
  // taking a line on the card. Same for the slipping and not-started counts:
  // this card answers "how much do I know, and how deep is it", and every extra
  // caption pulled attention off that one sentence.
  const dotScaleNote =
    distribution.wordsPerDot > 1
      ? ` ${STRINGS.PRACTICE_DOT_SCALE.replace('{count}', String(distribution.wordsPerDot))}.`
      : '';

  const accessibilityLabel = hasMeasuredMemory
    ? STRINGS.HORIZON_BAND_A11Y.replace('{recall}', String(recallableWords))
        .replace('{total}', String(practisedCount))
        .replace('{breakdown}', getHorizonBandsAccessibilityLabel(bands)) + dotScaleNote
    : STRINGS.HORIZON_BAND_A11Y_EMPTY;

  return (
    <BaseCard onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <View style={styles.body}>
        <ThemedText type="caption" colorName="subtleLabelText">
          {STRINGS.PRACTICE_RECALL_NOW_LABEL}
        </ThemedText>

        <View style={styles.headline}>
          <AnimatedCount
            value={recallableWords}
            // Nothing practised is not a measurement of zero. "0" here would
            // tell someone who has just built a word list that they would
            // remember none of it.
            placeholder={hasMeasuredMemory ? undefined : STRINGS.EMPTY_METRIC}
            style={styles.value}
            // The card announces the whole story in one sentence; a second
            // reading of the bare number would only repeat part of it.
            silent
          />
          {hasMeasuredMemory && (
            <ThemedText type="caption" colorName="textTertiary" style={styles.denominator}>
              {STRINGS.PRACTICE_RECALL_OF_TOTAL.replace('{total}', String(practisedCount))}
            </ThemedText>
          )}
        </View>
      </View>

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
        />
      </View>

      <View style={styles.footer}>
        <ThemedText type="caption" colorName="captionText" numberOfLines={1}>
          {hasDistribution
            ? STRINGS.PRACTICE_TYPICAL_HORIZON.replace('{horizon}', medianLabel)
            : STRINGS.PRACTICE_RECALL_EMPTY}
        </ThemedText>
      </View>
    </BaseCard>
  );
}

MemoryHorizonCard.displayName = 'MemoryHorizonCard';

const styles = StyleSheet.create({
  body: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  headline: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.15,
    fontFamily: FONTS.ENGLISH_BOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    includeFontPadding: false,
  },
  denominator: {
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  // Full-bleed: the canvas is exactly the card's own width, so it must not sit
  // inside horizontal padding or it overflows the rounded corners.
  band: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  footer: {
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
});
