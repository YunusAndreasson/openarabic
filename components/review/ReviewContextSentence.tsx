import { Icon } from '@/components/ui';
import { memo, useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { SkiaColoredArabic } from '@/components/common/SkiaColoredArabic';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useColors } from '@/hooks/theme/useColors';
import type { ExampleWord, WordExample } from '@/services/sentences';

/**
 * Line height for the example, as a multiple of its font size.
 *
 * `arabicCompact` renders at LOOSE (1.6x), which is tuned for the dictionary's
 * dense index rows. React Native honours a lineHeight smaller than the font's
 * own line box strictly and centres the glyphs inside it, so on a fully
 * vocalized sentence — which every corpus sentence is — tanween and
 * shadda+vowel stacks were cut off along the top edge. Reading Arabic (2.2x)
 * has the headroom but costs 48px a line, which this block cannot spend under
 * the answer.
 *
 * 1.9x clears Noto Sans Arabic's mark stack (~1.5em above the baseline) with
 * room to spare, at 42px a line. Local rather than a shared token because
 * widening LOOSE would make every dictionary row taller.
 */
const EXAMPLE_LINE_HEIGHT = 1.9;

/**
 * Lines of translation shown before the ellipsis. Measured against the corpus
 * rather than guessed: of the 5,523 sentences that can be picked as an example
 * (those with a word at difficulty ≤ 2), at the ~42 characters this block fits
 * per line, 2 lines covered only 73.1% of them and cut the rest mid-sentence.
 * 3 lines covers 92.3% — the smallest budget that clears 90%, and 21px cheaper
 * than the 4 lines it would take to reach 97.7%.
 */
const ENGLISH_LINES = 3;

const STATIC_STYLES = StyleSheet.create({
  container: {
    width: '100%',
    // A clear step up from the gaps *inside* this block, so proximity alone
    // separates "the answer" from "the evidence" — no rule, no second surface.
    marginTop: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  // Word-level composition, same as the reader (components/article/
  // ArticleSentence): row-reverse + wrap puts Arabic words in reading order and
  // breaks between words rather than mid-word. Centred here because the card is
  // a centred composition, whereas the reader's column is left-aligned.
  sentenceRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.HALF_TINY,
  },
  // Applied to EVERY word, not just the marked one, so the underline's
  // reserved space cannot shift the line when the target happens to fall at
  // a wrap point.
  word: {
    paddingHorizontal: LAYOUT.SPACING.HALF_TINY,
    // Clears Arabic descenders (ي ج ن) from the marker rule below — same
    // reasoning as sentenceWordLayout's MARKER_UNDERLINE_GAP.
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  // Same visual channel as the reader's marker rule (SkiaSentenceWords) — a saved word in the
  // reader, a highlighted word in onboarding, and the practised word here are
  // all "this word is yours" in one language. Painted as an absolutely
  // positioned bar, not a `borderBottomWidth`: Android draws a bottom-only
  // border on a rounded box as a degenerate arc across the corner radius, so
  // a real border here would silently fail to render.
  targetUnderline: {
    position: 'absolute',
    left: LAYOUT.SPACING.MICRO,
    right: LAYOUT.SPACING.MICRO,
    bottom: 0,
    height: LAYOUT.BORDER.WIDTH.FOCUSED,
  },
  english: {
    textAlign: 'center',
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.TINY,
  },
});

interface Props {
  example: WordExample;
  /** Plays the sentence audio. Explicit tap only — never automatic, so the
   *  session keeps its no-background-network property. */
  onPlay?: () => void;
}

/**
 * The practised word shown in a real sentence from the corpus, on the answer
 * face.
 *
 * This is the card's reason to exist as a surface. A bare word/gloss pair is
 * the weakest thing a review card can teach: it gives the learner nothing to
 * re-encode against after a failed recall, and it doesn't transfer to reading,
 * which is what this app is for. Seeing the inflected form inside a line they
 * may well have read is both the elaborative hook and the payoff.
 *
 * The sentence carries the SAME grammar colouring as the reader — segments are
 * precomputed per word in useReviewExamples via `computeColoredSegments`, so
 * review reinforces exactly the mapping reading teaches, including the rule
 * that a single-English-word gloss is never colour-coded.
 *
 * The practised word is marked by the same tint-coloured underline the reader
 * uses for a saved word and onboarding uses to point at one (SkiaSentenceWords'
 * marker rule) — not a background fill, and not the glyph colour itself:
 * hue is spoken for, since in this palette `tint` is the same hue as the
 * grammar palette's `possessive` AND as `success` ("Knew it"), so painting the
 * word itself would read as a grammatical role or as a verdict. The underline
 * is a shape, not a colour-coding — "this is yours", not "this is what it
 * does" — and reusing the app's one existing "this word is yours" mark keeps
 * it legible as the same claim rather than inventing a second one.
 */
export const ReviewContextSentence = memo(({ example, onPlay }: Props) => {
  const colors = useColors();
  // Same debounce as ThemedText's own Arabic path, so the example and the hero
  // above it resize in lockstep while the size slider is being dragged.
  const readerFontSize = useDebouncedArabicFontSize(100);

  const words = example.words;

  // A clear step below the reader's own size. At full size the example competed
  // with the hero Arabic above it — same script, same weight, near enough the
  // same size — so the answer face read as two headlines stacked rather than an
  // answer and its evidence. Hierarchy by scale, since colour is spoken for
  // (see the underline note above) and weight does nothing on Arabic glyphs.
  // The cap matches what `arabicCompact` resolves to, which the no-breakdown
  // fallback below still uses.
  const exampleFontSize = Math.min(
    readerFontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
  );

  // Only the fallback needs this: Skia sizes its own line box with generous
  // diacritic headroom, but `arabicCompact`'s 1.6x still clips mark stacks.
  const arabicLineStyle = useMemo<TextStyle>(
    () => ({
      lineHeight: Math.round(exampleFontSize * EXAMPLE_LINE_HEIGHT),
      // Android: keep the font's own vertical padding, which is where the mark
      // stack lives. arabicCompact turns it off for row density.
      includeFontPadding: true,
    }),
    [exampleFontSize],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={STATIC_STYLES.container}
    >
      {/* One a11y node: a screen reader should read the sentence, not eleven
          disconnected words. */}
      <View accessible accessibilityLabel={example.arabic} style={STATIC_STYLES.sentenceRow}>
        {words.length > 0 ? (
          words.map(word => (
            <View
              key={word.position}
              testID={`example-word-${word.position}`}
              style={STATIC_STYLES.word}
            >
              <ExampleWordText
                word={word}
                defaultColor={colors.arabicText}
                fontSize={exampleFontSize}
              />
              {word.isTarget ? (
                <View
                  testID={`example-word-${word.position}-underline`}
                  style={[STATIC_STYLES.targetUnderline, { backgroundColor: colors.tint }]}
                  pointerEvents="none"
                />
              ) : null}
            </View>
          ))
        ) : (
          // The corpus has the sentence but not its word breakdown. Rare, and a
          // plain line still teaches more than no example at all.
          <ThemedText
            type="arabicCompact"
            colorName="arabicText"
            align="center"
            style={arabicLineStyle}
          >
            {example.arabic}
          </ThemedText>
        )}
      </View>

      {example.english ? (
        <ThemedText
          type="caption"
          colorName="textTertiary"
          numberOfLines={ENGLISH_LINES}
          style={STATIC_STYLES.english}
        >
          {example.english}
        </ThemedText>
      ) : null}

      {onPlay && example.audioUrl ? (
        // Neutral, not tinted: inside this block `tint` means "the word you are
        // practising", and a tinted control would compete with the chip for it.
        <Pressable
          onPress={onPlay}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.PLAY_SENTENCE_AUDIO}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
          style={({ pressed }) => [
            STATIC_STYLES.playRow,
            { opacity: pressed ? LAYOUT.OPACITY.PRESSED : LAYOUT.OPACITY.FULL },
          ]}
        >
          {/* Same reasoning as the card's replay glyph: an audio control on this
              screen is secondary to the word, so it takes the icon token rather
              than a near-white text one. */}
          <Icon name="play" size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={colors.icon} />
          <ThemedText type="caption" colorName="secondaryText">
            {STRINGS.PLAY_SENTENCE_AUDIO}
          </ThemedText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
});

ReviewContextSentence.displayName = 'ReviewContextSentence';

/**
 * One word, painted by Skia so the glyphs shape and join as one word.
 *
 * This used to be coloured spans nested inside a single `<Text>`, on the
 * assumption that one Text element means one shaping run. On Android it does
 * not: each nested Text carries its own metric-affecting spans, `StaticLayout`
 * shapes each as a separate run, and Arabic comes apart at every colour
 * boundary — `أَزَالَتْ` rendered with its `تْ` floating free of the `ل`. Skia
 * shapes the whole word first and applies the colour runs to the shaped
 * glyphs, which is how the reader has always drawn these words.
 */
const ExampleWordText = ({
  word,
  defaultColor,
  fontSize,
}: {
  word: ExampleWord;
  defaultColor: string;
  /** Point size for the glyphs — see the note on `readerFontSize`. */
  fontSize: number;
}) => (
  <SkiaColoredArabic
    text={word.wordForm}
    segments={word.coloredSegments}
    fontSize={fontSize}
    color={defaultColor}
  />
);

ExampleWordText.displayName = 'ExampleWordText';
