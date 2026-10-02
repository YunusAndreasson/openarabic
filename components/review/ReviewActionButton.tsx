import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { getElevation } from '@/constants/elevation';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

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
  // The app's standalone-CTA shape — the same one `ThemedButton`'s
  // `shape="pill"` paints, spelled locally because this button's base style is
  // its own. A `primary` button takes it only when it has no peer: two buttons
  // sharing a row must share a corner radius too, or a pill next to a rounded
  // rect reads as two unrelated controls rather than one control's louder and
  // quieter states. The fill is what carries the hierarchy; shape stays
  // constant across the row.
  capsule: {
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
  // Tabular figures keep a centered "10m"/"4d" from jittering between cards.
  // No opacity: the interval is already a tier below the label by size and
  // weight, and dimming it on top of that was most of why the old tonal chips
  // read as washed out.
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
   * `quiet` (default) is a peer in a row of outcomes.
   *
   * `primary` is the loud, solid-fill treatment — the one action in the band
   * that's asking to be tapped. See the note on solid fills below for where
   * it may and may not appear.
   */
  variant?: 'quiet' | 'primary';
  /**
   * Only meaningful on a `primary` button. `true` (default) takes the app's
   * standalone-CTA pill shape — valid when this button is the row's only
   * occupant. Pass `false` when a `primary` button has a `quiet` peer, so
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
 * `quiet`, neutral against it rather than competing with it.
 *
 * The voice CTA passes `standalone={false}`: it has a `quiet` peer, so the
 * capsule shape is reserved for "Show answer" alone. Loudness there comes
 * entirely from the fill going solid, not from also changing the corner
 * radius underneath it — two shapes in one row would read as two different
 * controls rather than one control's louder and quieter states.
 */
export const ReviewActionButton = ({
  label,
  color,
  sublabel,
  variant = 'quiet',
  standalone = true,
  disabled = false,
  accessibilityLabel,
  onPress,
}: ReviewActionButtonProps) => {
  const colors = useColors();
  const isPrimary = variant === 'primary';
  const isCapsule = isPrimary && standalone;

  // Every button in this band wears the CARD's own material — the app's CARD
  // elevation, and for a quiet button `colors.card`, the same fill BaseCard and
  // the flip card directly above paint.
  //
  // A quiet button used to be a tonal chip instead: the outcome hue mixed into
  // the fill AND drawn as the border AND set on the label, so three washes of
  // red / amber / green sat in a row under a neutral card. Saying the same
  // thing three ways made the band the loudest part of the screen and left it
  // reading as a strip of foreign controls rather than a continuation of the
  // card it grades. The hue now lives only in the type, which is where the
  // grade's meaning is, and the surface is shared — so the card and the row
  // below it are visibly the same material (gestalt similarity).
  //
  // Loudness is reserved for `primary`, the one button in the band that is
  // asking to be tapped. Its filled tokens still mirror `ThemedButton`'s, so
  // the review screen's CTA is the same button the rest of the app uses.
  const cardElevation = getElevation(colors, 'CARD');

  const restBg = isPrimary ? (disabled ? colors.disabledButtonBg : colors.tint) : colors.card;
  const pressedBg = isPrimary ? colors.tint : colors.elevation2;
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
      style={({ pressed }) => {
        const background = pressed ? pressedBg : restBg;
        return [
          STATIC_STYLES.button,
          isCapsule && STATIC_STYLES.capsule,
          cardElevation,
          {
            backgroundColor: background,
            // A quiet button has no visible edge, matching the card above,
            // which separates from the page by elevation alone and carries no
            // stroke. The border WIDTH stays, painted in the current fill, so a
            // quiet button and a `primary` peer in the same row keep identical
            // box metrics — the band's height must not move between states, or
            // the card above it shifts.
            borderColor: isPrimary ? (disabled ? colors.cardBorder : colors.tint) : background,
          },
          // A filled surface has no headroom for a deeper fill on press, so the
          // capsule dims instead — the same press idiom as the card's own
          // controls. A quiet button keeps the fill swap, which reads better on
          // a surface that is mostly its own background.
          isPrimary && pressed && { opacity: LAYOUT.OPACITY.PRESSED },
        ];
      }}
    >
      <ThemedText
        skipDefaultColor
        type="bodyBold"
        numberOfLines={1}
        // Each grade button is a third of the row, and "Guessed" is the label
        // that runs out of room first at large system font scales. Shrinking a
        // touch is better than clipping the word that names the outcome.
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{ color: labelColor }}
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
          // smudge. On the card fill the hue reads cleanly at full strength, and
          // size and weight are tier enough on their own — 13pt regular under
          // 16pt semibold — so it stays lit rather than dimmed.
          style={[STATIC_STYLES.sublabel, { color }]}
        >
          {sublabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
};

ReviewActionButton.displayName = 'ReviewActionButton';
