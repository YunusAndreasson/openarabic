import { Ionicons } from '@/components/ui/Icon';
import type { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ContextualHelpType } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';
import { ReviewAction } from '@/types/enums';
import { withAlpha } from '@/utils/colorUtils';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';

const BOTTOM_ACTIONS_CONSTANTS = {
  ICON_SIZE: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  BUTTON_HEIGHT: LAYOUT.BUTTON.HEIGHT.LARGE, // 48 — generous tap target
  TINT_BG_OPACITY: LAYOUT.OPACITY.FAINT, // 0.15 — subtle tinted surface
  PRESSED_BG_OPACITY: LAYOUT.OPACITY.SUBTLE, // 0.3 — feedback when pressed
} as const;

const STATIC_STYLES = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BOTTOM_ACTIONS_CONSTANTS.BUTTON_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  buttonLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
});

interface ReviewBottomActionsProps {
  onPressLeft?: () => void;
  onPressRight?: () => void;
  onShowContextualHelp?: (helpType: ContextualHelpType) => void;
  disabled?: boolean;
  /**
   * Voice grading hint. When the speech recognizer transcribed a recording for
   * this card, this prop tells the buttons which choice the recognizer leans
   * toward so the visual weight nudges the user that way. The user can still
   * tap either button — the hint never auto-submits. null = no hint
   * (no voice attempt yet, or voice grading is off).
   */
  voiceHint?: 'known' | 'unknown' | null;
}

/**
 * Full-width action buttons mirroring the swipe gestures in the review card.
 * Tap submits the answer (same as swipe). Long-press surfaces contextual help.
 */
export const ReviewBottomActions: FC<ReviewBottomActionsProps> = ({
  onPressLeft,
  onPressRight,
  onShowContextualHelp,
  disabled = false,
  voiceHint = null,
}) => {
  const colors = useColors();

  // When the voice grader leans one way, that button gets the "pressed-level"
  // tint as a resting state so it visually stands out next to the other. The
  // unhinted side stays at the normal subtle tint. With no hint both buttons
  // render identically (current behaviour preserved).
  const leftHinted = voiceHint === 'unknown';
  const rightHinted = voiceHint === 'known';
  const leftBgOpacity = leftHinted
    ? BOTTOM_ACTIONS_CONSTANTS.PRESSED_BG_OPACITY
    : BOTTOM_ACTIONS_CONSTANTS.TINT_BG_OPACITY;
  const rightBgOpacity = rightHinted
    ? BOTTOM_ACTIONS_CONSTANTS.PRESSED_BG_OPACITY
    : BOTTOM_ACTIONS_CONSTANTS.TINT_BG_OPACITY;
  const leftBorderOpacity = leftHinted ? LAYOUT.OPACITY.FULL : LAYOUT.OPACITY.LIGHT;
  const rightBorderOpacity = rightHinted ? LAYOUT.OPACITY.FULL : LAYOUT.OPACITY.LIGHT;
  const leftBg = withAlpha(colors.error, leftBgOpacity);
  const rightBg = withAlpha(colors.success, rightBgOpacity);
  const leftBgPressed = withAlpha(colors.error, BOTTOM_ACTIONS_CONSTANTS.PRESSED_BG_OPACITY);
  const rightBgPressed = withAlpha(colors.success, BOTTOM_ACTIONS_CONSTANTS.PRESSED_BG_OPACITY);
  const leftBorder = withAlpha(colors.error, leftBorderOpacity);
  const rightBorder = withAlpha(colors.success, rightBorderOpacity);

  const handleLeftPress = () => {
    if (disabled) return;
    lightFeedback();
    onPressLeft?.();
  };

  const handleRightPress = () => {
    if (disabled) return;
    selectionFeedback();
    onPressRight?.();
  };

  const handleLeftLongPress = () => {
    onShowContextualHelp?.(ContextualHelpType.SWIPE_LEFT);
  };

  const handleRightLongPress = () => {
    onShowContextualHelp?.(ContextualHelpType.SWIPE_RIGHT);
  };

  return (
    <View style={STATIC_STYLES.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ReviewAction.DONT_KNOW}
        accessibilityHint="Tap to mark as unknown. Long-press for help."
        hitSlop={LAYOUT.HIT_SLOP.SMALL}
        onPress={handleLeftPress}
        onLongPress={handleLeftLongPress}
        disabled={disabled}
        style={({ pressed }) => [
          STATIC_STYLES.button,
          {
            backgroundColor: pressed ? leftBgPressed : leftBg,
            borderColor: leftBorder,
            opacity: disabled ? LAYOUT.OPACITY.SUBTLE : LAYOUT.OPACITY.FULL,
          },
        ]}
      >
        <Ionicons name="close" size={BOTTOM_ACTIONS_CONSTANTS.ICON_SIZE} color={colors.error} />
        <ThemedText
          skipDefaultColor
          weight="semibold"
          style={[STATIC_STYLES.buttonLabel, { color: colors.error }]}
        >
          {ReviewAction.DONT_KNOW}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ReviewAction.KNOW}
        accessibilityHint="Tap to mark as known. Long-press for help."
        hitSlop={LAYOUT.HIT_SLOP.SMALL}
        onPress={handleRightPress}
        onLongPress={handleRightLongPress}
        disabled={disabled}
        style={({ pressed }) => [
          STATIC_STYLES.button,
          {
            backgroundColor: pressed ? rightBgPressed : rightBg,
            borderColor: rightBorder,
            opacity: disabled ? LAYOUT.OPACITY.SUBTLE : LAYOUT.OPACITY.FULL,
          },
        ]}
      >
        <Ionicons
          name="checkmark"
          size={BOTTOM_ACTIONS_CONSTANTS.ICON_SIZE}
          color={colors.success}
        />
        <ThemedText
          skipDefaultColor
          weight="semibold"
          style={[STATIC_STYLES.buttonLabel, { color: colors.success }]}
        >
          {ReviewAction.KNOW}
        </ThemedText>
      </Pressable>
    </View>
  );
};

ReviewBottomActions.displayName = 'ReviewBottomActions';
