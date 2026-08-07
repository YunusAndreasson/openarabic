import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import type { WordDisplayProps } from '@/types/ui/review.types';

/**
 * Combining marks (fatha, damma, kasra, sukun, shadda, tanween, dagger alif)
 * and the tatweel stretcher. They stack above/below a base letter rather than
 * advancing the pen, so counting them makes a short vocalized word look long
 * and shrinks the hero for no reason.
 */
const ARABIC_DIACRITICS = /[ً-ْٰـۖ-ۭ]/g;

const HERO = {
  /** Multiplier on the reader's Arabic size. The default reading size is 32,
   *  so this lands on 64 — exactly the size this card has always used — while
   *  now honouring a learner who has scaled their Arabic up or down. */
  SCALE: 2,
  MIN: 40,
  MAX: 64,
  /** Letters (excluding diacritics) past which the hero steps down, so a long
   *  word stays on one line instead of wrapping into the divider below it. */
  STEP_DOWN_AT: 7,
  STEP_DOWN_HARD_AT: 11,
} as const;

/** Height reserved for the hero row on BOTH faces. Fixed rather than intrinsic
 *  because the two faces are absolutely stacked and flipped: if the Arabic sat
 *  at a different y on each, the word would visibly jump at the halfway point
 *  of the rotation. Two lines' worth, so a wrapped word doesn't shift it. */
const heroBlockHeight = (fontSize: number): number =>
  Math.round(fontSize * LINE_HEIGHT_MULTIPLIERS.ARABIC * 1.15);

const STATIC_STYLES = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  metaRow: {
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
  },
  // Flex spacers rather than fixed offsets: they resolve identically on both
  // faces (same structure, same flex values), which is what keeps the Arabic at
  // an identical y through the flip, while still adapting to the card's height
  // on any device. Ratio puts the word around a third of the way down instead
  // of flush against the top edge.
  heroLead: {
    flexGrow: 1,
  },
  heroRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 2.6,
    width: '100%',
    alignItems: 'center',
  },
});

interface Props extends WordDisplayProps {
  /** Grammatical class ("Verb", "Noun"), when the corpus knows one. Optional by
   *  design — it comes from the example-sentence join, which not every root has. */
  wordType?: string | null;
  /** Face-specific content rendered below the hero (the meaning and its example
   *  on the answer face, the voice channel on the question face). */
  children?: ReactNode;
}

/**
 * The shared top of both card faces: an optional word-class label and the
 * Arabic itself, laid out so the hero occupies an identical band on each face.
 *
 * Previously this positioned the Arabic at `top: 12` and the meaning at
 * `top: 192` inside a fixed 336px box — magic numbers that ignored how tall the
 * Arabic actually rendered, left ~130px of dead space between the two, and
 * collided once a word wrapped to two lines.
 */
export function WordDisplay({ word, style, onWordPress, wordType, children }: Props) {
  const readerFontSize = useDebouncedArabicFontSize(100);

  const heroFontSize = useMemo(() => {
    const base = Math.min(HERO.MAX, Math.max(HERO.MIN, (readerFontSize || 32) * HERO.SCALE));
    const letters = word.replace(ARABIC_DIACRITICS, '').trim().length;
    if (letters >= HERO.STEP_DOWN_HARD_AT) return Math.round(base * 0.62);
    if (letters >= HERO.STEP_DOWN_AT) return Math.round(base * 0.8);
    return Math.round(base);
  }, [readerFontSize, word]);

  // No drop shadow: `createTextStyle` spread LAYOUT.ELEVATION.SMALL onto the
  // glyphs, which reads as dated on its own and actively muddies vocalized
  // Arabic — a shadow under a kasra is visual noise at exactly the size the
  // learner is trying to read the mark.
  const heroTextStyle = useMemo(
    () => ({ fontSize: heroFontSize, lineHeight: heroFontSize * LINE_HEIGHT_MULTIPLIERS.ARABIC }),
    [heroFontSize],
  );

  return (
    <View style={[STATIC_STYLES.container, style]}>
      <View style={STATIC_STYLES.metaRow}>
        {wordType ? (
          <ThemedText type="overline" colorName="textTertiary">
            {wordType}
          </ThemedText>
        ) : null}
      </View>

      <View style={STATIC_STYLES.heroLead} pointerEvents="none" />

      <View style={[STATIC_STYLES.heroRow, { height: heroBlockHeight(heroFontSize) }]}>
        <Pressable
          style={STATIC_STYLES.heroPressable}
          onPress={onWordPress}
          disabled={!onWordPress}
          accessibilityRole={onWordPress ? 'button' : undefined}
        >
          <ThemedText type="arabic" colorName="arabicText" align="center" style={heroTextStyle}>
            {word}
          </ThemedText>
        </Pressable>
      </View>

      <View style={STATIC_STYLES.body}>{children}</View>
    </View>
  );
}

WordDisplay.displayName = 'WordDisplay';
