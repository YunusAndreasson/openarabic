import type { FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { mixColors, withAlpha } from '@/utils/colorUtils';

/**
 * How an outcome hue is turned into a chip.
 *
 * The fill is *mixed into* the elevation surface rather than laid over the page
 * as a translucent wash. An alpha fill composites against whatever is behind
 * the button, which on this screen is `colors.background` — near-black in dark
 * mode — so a hue at 15% resolved to near-black whatever the hue was: "Guessed"
 * came out an olive-brown, "Knew it" a barely-green charcoal. Three outcomes,
 * three sludges. Mixing into `elevation2` keeps each hue recognisably itself in
 * dark mode and lifts the chip off the page as a surface.
 *
 * The border stays alpha on purpose: it composites over the chip's own opaque
 * fill, so it reads as a stronger edge of the same hue rather than washing out.
 * It is what actually carries the colour at rest.
 */
const GRADE_SURFACE = {
  /** Hue mixed into the elevation surface for the resting fill. */
  FILL: 0.22,
  /** Same mix, deeper, so a press reads without changing the chip's shape. */
  FILL_PRESSED: 0.35,
  /** Hue over the resting fill. Above LAYOUT.OPACITY.LIGHT — see above. */
  BORDER: 0.35,
} as const;

const STATIC_STYLES = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Taller than a single-line button so the label + sub-label both fit.
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  // The app's standalone-CTA shape (see PinnedActionButton) — a `primary`
  // button takes this only when it has no peer. Two buttons sharing a row
  // must share a corner radius too: a pill next to a rounded rect reads as
  // two unrelated controls, not as one control's louder and quieter states.
  // The fill (solid tint vs. tinted chip) is what carries the hierarchy;
  // shape stays constant across the row.
  capsule: {
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  // Tabular figures keep a centered "10m"/"4d" from jittering between cards.
  // No opacity: the interval is already a tier below the label by size and
  // weight, and dimming it on top of that was most of why the chips read as
  // washed out.
  sublabel: {
    marginTop: LAYOUT.SPACING.TINY,
    fontVariant: ['tabular-nums'],
  },
});

interface ReviewActionButtonProps {
  label: string;
  /** Outcome colour: drives the fill, the border and the label. Ignored by the
   *  `primary` variant, which paints itself from the theme's tint. */
  color: string;
  /** Quiet second line — the interval a grade buys. */
  sublabel?: string;
  /**
   * `tinted` (default) is a peer in a row of outcomes.
   *
   * `primary` is the loud, solid-fill treatment — the one action in the band
   * that's asking to be tapped. See the note on solid fills below for where
   * it may and may not appear.
   */
  variant?: 'tinted' | 'primary';
  /**
   * Only meaningful on a `primary` button. `true` (default) takes the app's
   * standalone-CTA pill shape — valid when this button is the row's only
   * occupant. Pass `false` when a `primary` button has a `tinted` peer, so
   * both keep the row's shared rounded-rect shape and differ by fill alone.
   */
  standalone?: boolean;
  disabled?: boolean;
  /** Defaults to `label`; pass the long form when the label is abbreviated. */
  accessibilityLabel?: string;
  onPress: () => void;
}

/**
 * One button in the review screen's bottom action band.
 *
 * Shared by the self-grade row and the voice-miss row so the two are identical
 * by construction rather than by copy: they occupy the same band, one after the
 * other, and any drift in height or rhythm between them would move the card
 * above. Purely presentational — the haptic weight belongs to the caller,
 * because "Forgot" and "Try again" do not feel the same.
 *
 * Every button in the band is one line of label (plus, on a grade, the quiet
 * interval it buys). There is deliberately no glyph slot: the mic glyph made
 * the voice button two rows tall beside a one-row "Show answer" so the pair
 * never read as alternatives.
 *
 * On solid fills, and where `primary` may and may not appear:
 *
 * A solid fill was once used to nudge the likeliest choice after a voice miss,
 * and it turned whichever button it landed on into a block of flat colour that
 * out-shouted the two real outcomes either side of it. That still holds for any
 * row of OUTCOMES: the grade bar and the voice-result row must stay rows of
 * peers, because a louder option biases self-grading and self-grading is the
 * input to FSRS. `primary` is invalid on every member of those two rows,
 * without exception.
 *
 * The reveal row is not an outcome row — "Show answer" and the voice CTA are
 * two ways to do the same thing, not two judgements of what already happened —
 * so nudging there costs FSRS nothing. `primary` marks whichever of the two is
 * this screen's invitation: the voice CTA when a mic is offered (this is the
 * exercise; revealing is the way out of it), or "Show answer" alone once voice
 * is off and there is no CTA to defer to. The one not carrying `primary` stays
 * `tinted`, neutral against it rather than competing with it.
 *
 * The voice CTA passes `standalone={false}`: it has a `tinted` peer, so the
 * capsule shape is reserved for "Show answer" alone. Loudness there comes
 * entirely from the fill going solid, not from also changing the corner
 * radius underneath it — two shapes in one row would read as two different
 * controls rather than one control's louder and quieter states.
 */
export const ReviewActionButton: FC<ReviewActionButtonProps> = ({
  label,
  color,
  sublabel,
  variant = 'tinted',
  standalone = true,
  disabled = false,
  accessibilityLabel,
  onPress,
}) => {
  const colors = useColors();
  const isPrimary = variant === 'primary';
  const isCapsule = isPrimary && standalone;

  // Filled variant mirrors ThemedButton's `filled` tokens so the review screen's
  // CTA is the same button the rest of the app uses, not a lookalike.
  const restBg = isPrimary
    ? disabled
      ? colors.disabledButtonBg
      : colors.tint
    : mixColors(colors.elevation2, color, GRADE_SURFACE.FILL);
  const pressedBg = isPrimary
    ? colors.tint
    : mixColors(colors.elevation2, color, GRADE_SURFACE.FILL_PRESSED);
  const borderColor = isPrimary
    ? disabled
      ? colors.cardBorder
      : colors.tint
    : withAlpha(color, GRADE_SURFACE.BORDER);
  const labelColor = isPrimary ? (disabled ? colors.disabled : colors.onTint) : color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={sublabel ? { text: sublabel } : undefined}
      accessibilityState={{ disabled }}
      hitSlop={LAYOUT.HIT_SLOP.SMALL}
      disabled={disabled}
      onPress={onPress}
      // No disabled dim here. `disabled` is set for the ~180ms of a card
      // advance, during which the whole bottom slot is already fading out in
      // step with the card, and dimming on top of that read as an unrelated
      // flicker on every single grade. A caller that stays disabled longer than
      // an eyeblink is responsible for showing it (see VoiceAnswerButton).
      style={({ pressed }) => [
        STATIC_STYLES.button,
        isCapsule && STATIC_STYLES.capsule,
        { backgroundColor: pressed ? pressedBg : restBg, borderColor },
        // A filled surface has no headroom for a deeper fill on press, so the
        // capsule dims instead — the same press idiom as the card's own
        // controls. The tinted chips keep the fill swap, which reads better on
        // a surface that is mostly its own background.
        isPrimary && pressed && { opacity: LAYOUT.OPACITY.PRESSED },
      ]}
    >
      <ThemedText
        skipDefaultColor
        weight="semibold"
        numberOfLines={1}
        style={[STATIC_STYLES.label, { color: labelColor }]}
      >
        {label}
      </ThemedText>
      {sublabel ? (
        <ThemedText
          skipDefaultColor
          type="caption"
          numberOfLines={1}
          // The outcome hue at full strength. It used to be the same hue at 70%
          // opacity, which on the old near-black fill left the interval as a
          // smudge; a neutral grey fixes the contrast but reads as dead matter
          // sitting in a coloured chip. With the fill now carrying real colour,
          // size and weight are enough of a tier on their own — 13pt regular
          // under 16pt semibold — so the hue can stay lit.
          style={[STATIC_STYLES.sublabel, { color }]}
        >
          {sublabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
};

ReviewActionButton.displayName = 'ReviewActionButton';
