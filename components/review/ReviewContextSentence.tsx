import { memo, useMemo, type FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { WordExample } from '@/services/sentences';

const STATIC_STYLES = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  arabic: {
    textAlign: 'center',
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
 * Kept typographically quiet on purpose — the answer is the headline, this is
 * the evidence under it. Only the target word is tinted; full grammar colouring
 * (computeColoredSegments) is available but reads as busy at this size.
 */
export const ReviewContextSentence: FC<Props> = memo(({ example, onPlay }) => {
  const colors = useColors();

  // Split on the inflected form so it can be tinted in place. The corpus stores
  // the exact surface form, so a plain segment split is enough — no matching
  // heuristics, and if it isn't found the sentence just renders untinted.
  const segments = useMemo(() => {
    // Keyed by character offset rather than array position: the offset is a
    // real identity for a slice of an immutable string, and it stays stable if
    // the split ever changes shape.
    const whole = [{ key: 'all-0', text: example.arabic, match: false }];
    const form = example.wordForm?.trim();
    if (!form) return whole;
    const parts = example.arabic.split(form);
    if (parts.length === 1) return whole;

    const out: { key: string; text: string; match: boolean }[] = [];
    let offset = 0;
    parts.forEach((part, i) => {
      if (part) {
        out.push({ key: `t-${offset}`, text: part, match: false });
        offset += part.length;
      }
      if (i < parts.length - 1) {
        out.push({ key: `m-${offset}`, text: form, match: true });
        offset += form.length;
      }
    });
    return out;
  }, [example.arabic, example.wordForm]);

  return (
    <Animated.View
      entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={STATIC_STYLES.container}
    >
      <ThemedText type="arabicCompact" align="center" style={STATIC_STYLES.arabic}>
        {segments.map(seg => (
          <ThemedText
            key={seg.key}
            type="arabicCompact"
            skipDefaultColor
            style={{ color: seg.match ? colors.tint : colors.arabicText }}
          >
            {seg.text}
          </ThemedText>
        ))}
      </ThemedText>

      {example.english ? (
        <ThemedText type="caption" colorName="textTertiary" style={STATIC_STYLES.english}>
          {example.english}
        </ThemedText>
      ) : null}

      {onPlay && example.audioUrl ? (
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
          <Ionicons name="play" size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={colors.tint} />
          <ThemedText skipDefaultColor type="caption" style={{ color: colors.tint }}>
            {STRINGS.PLAY_SENTENCE_AUDIO}
          </ThemedText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
});

ReviewContextSentence.displayName = 'ReviewContextSentence';
