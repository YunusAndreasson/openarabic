import type { FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { withAlpha } from '@/utils/colorUtils';

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
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  // Tabular figures keep a centered "10m"/"4d" from jittering between cards.
  sublabel: {
    marginTop: LAYOUT.SPACING.TINY,
    fontVariant: ['tabular-nums'],
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

interface ReviewActionButtonProps {
  label: string;
  /** Outcome colour: drives the fill, the border and the label. */
  color: string;
  /** Quiet second line — the interval a grade buys. */
  sublabel?: string;
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
 * interval it buys). There is deliberately no glyph slot and no solid-fill
 * "emphasized" variant: the mic glyph made the voice button two rows tall
 * beside a one-row "Show answer" so the pair never read as alternatives, and
 * the solid fill — used to nudge the likeliest choice after a voice miss —
 * turned whichever button it landed on into a block of flat colour that
 * out-shouted the two real outcomes either side of it. A row of peers is the
 * point; if one of them needs to be louder, that is a decision for the copy,
 * not for the paint.
 */
export const ReviewActionButton: FC<ReviewActionButtonProps> = ({
  label,
  color,
  sublabel,
  disabled = false,
  accessibilityLabel,
  onPress,
}) => {
  const restBg = withAlpha(color, LAYOUT.OPACITY.FAINT);
  const pressedBg = withAlpha(color, LAYOUT.OPACITY.SUBTLE);
  const borderColor = withAlpha(color, LAYOUT.OPACITY.LIGHT);

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
        { backgroundColor: pressed ? pressedBg : restBg, borderColor },
      ]}
    >
      <ThemedText
        skipDefaultColor
        weight="semibold"
        numberOfLines={1}
        style={[STATIC_STYLES.label, { color }]}
      >
        {label}
      </ThemedText>
      {sublabel ? (
        <ThemedText
          skipDefaultColor
          type="caption"
          numberOfLines={1}
          style={[STATIC_STYLES.sublabel, { color }]}
        >
          {sublabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
};

ReviewActionButton.displayName = 'ReviewActionButton';
