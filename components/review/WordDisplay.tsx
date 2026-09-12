import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';

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
  // The lead above the Arabic, as a fraction of the card rather than a share of
  // whatever is left over.
  //
  // This used to be `flexGrow: 0.55` against a `flexGrow: 2.6` body, which was
  // meant to resolve identically on both faces — but a grow ratio splits the
  // FREE space, and free space is the card minus the body's own content. The
  // two faces hold different content (a meaning and an example sentence on one,
  // the voice channel or a replay button on the other), so the split differed
  // and the hero already sat at a slightly different y on each. A fixed
  // fraction is content-independent, so the Arabic is pinned to the same band
  // on both faces by construction — which is what the flip needs, since the two
  // are absolutely stacked and a mismatch shows as a jump at the halfway point
  // of the rotation.
  //
  // The value places the hero + meaning block just above true centre: the old
  // ratio left the word ~31% down with the whole lower half of the card empty
  // whenever a word had no example sentence.
  heroLead: {
    // Measured on device against both faces: this lands the block a little
    // above true centre on each, which is where the eye expects it.
    height: '28%',
    // Yields to the body when a long example sentence needs the room.
    flexShrink: 1,
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
  // The word IS the replay control, so the tap has to answer for itself. There
  // is no border or glyph to dim — audio starts a beat later than the finger
  // lifts, and without this the learner cannot tell a registered tap from a
  // missed one and taps again.
  heroPressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  // Sized by its content now, not by a share of the card. It grew to fill
  // everything below the hero, so a word with no example sentence ended with
  // half a card of dead air inside a bordered box.
  // flexShrink 0 so the lead above gives up its space first: a long example
  // sentence should push the word toward the top of the card, never be clipped
  // to preserve a centred hero.
  body: {
    width: '100%',
    alignItems: 'center',
    flexShrink: 0,
  },
  // Absorbs whatever is left under the content, so the slack sits below the
  // block instead of inside it and the hero keeps its fixed lead.
  trailer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
});

interface Props {
  /** The Arabic word to display */
  word: string;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Replay this word's audio. Omitted when replay is unavailable — the word
   *  then takes no press of its own and the tap falls through to whatever the
   *  face does with it. */
  onWordPress?: () => void;
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

  // No drop shadow on the glyphs, deliberately: it reads as dated on its own
  // and actively muddies vocalized Arabic — a shadow under a kasra is visual
  // noise at exactly the size the learner is trying to read the mark.
  const heroTextStyle = useMemo(
    () => ({ fontSize: heroFontSize, lineHeight: heroFontSize * LINE_HEIGHT_MULTIPLIERS.ARABIC }),
    [heroFontSize],
  );

  return (
    <View style={[STATIC_STYLES.container, style]}>
      <View style={STATIC_STYLES.metaRow}>
        {wordType ? (
          // Tinted rather than tertiary grey: it is the only tier between the
          // Arabic hero and the meaning, and at 13px it needs colour
          // to register as a level at all rather than as faint noise.
          <ThemedText type="overline" colorName="tint">
            {wordType}
          </ThemedText>
        ) : null}
      </View>

      <View style={STATIC_STYLES.heroLead} pointerEvents="none" />

      <View style={[STATIC_STYLES.heroRow, { height: heroBlockHeight(heroFontSize) }]}>
        <Pressable
          style={({ pressed }) => [
            STATIC_STYLES.heroPressable,
            pressed ? STATIC_STYLES.heroPressed : null,
          ]}
          onPress={onWordPress}
          disabled={!onWordPress}
          accessibilityRole={onWordPress ? 'button' : undefined}
          // A hint, not a label: the label is the Arabic itself, which is the
          // one thing a screen reader must still announce here.
          accessibilityHint={onWordPress ? STRINGS.REPLAY_WORD_AUDIO : undefined}
        >
          <ThemedText type="arabic" colorName="arabicText" align="center" style={heroTextStyle}>
            {word}
          </ThemedText>
        </Pressable>
      </View>

      <View style={STATIC_STYLES.body}>{children}</View>

      <View style={STATIC_STYLES.trailer} pointerEvents="none" />
    </View>
  );
}

WordDisplay.displayName = 'WordDisplay';
