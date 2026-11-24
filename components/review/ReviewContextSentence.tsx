import { Icon } from '@/components/ui';
import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { ReviewSentenceWords } from './ReviewSentenceWords';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { WordExample } from '@/services/sentences';

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
  const { handlePress: handlePlay } = useButtonPress({ onPress: onPlay });
  return (
    <Animated.View
      entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={STATIC_STYLES.container}
    >
      <ReviewSentenceWords sentence={example.arabic} words={example.words} />

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
          onPress={handlePlay}
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
