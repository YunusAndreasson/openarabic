import { memo, useCallback, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useListenScreen } from '@/hooks/listen/useListenScreen';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import type { EditModeType } from '@/store/editModeSlice';
import { selectionFeedback } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EditModeButtonProps {
  /**
   * The type of edit mode this button controls
   */
  type: EditModeType;

  /**
   * Optional callback when edit mode changes
   */
  onEditModeChange?: (editMode: boolean) => void;

  /**
   * Optional custom styling
   */
  style?: ViewStyle;
  /** If provided, hides the button when count is 0 */
  itemCount?: number;
  /** Convenience flag to hide when empty without passing count explicitly */
  hideWhenEmpty?: boolean;
}

const EditModeButton: FC<EditModeButtonProps> = ({
  type,
  onEditModeChange,
  style,
  itemCount,
  hideWhenEmpty,
}) => {
  const colors = useColors();
  const { editMode, toggle } = useEditMode(type);
  // Derive count internally for listen type when not provided
  const { sortedReadingList } = useListenScreen();
  const derivedCount = type === 'listen' ? sortedReadingList.length : undefined;
  const effectiveCount = itemCount ?? derivedCount ?? undefined;

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = useCallback((): void => {
    selectionFeedback();
    toggle();
    onEditModeChange?.(!editMode);
  }, [toggle, editMode, onEditModeChange]);

  // Guard early return only after all hooks and callbacks above have been created
  if (hideWhenEmpty && (effectiveCount ?? 0) <= 0) {
    return null;
  }

  const buttonText = editMode
    ? STRINGS.DONE
    : type === 'listen'
    ? STRINGS.MANAGE
    : type === 'dictionary'
    ? STRINGS.MANAGE
    : STRINGS.EDIT;

  return (
    <AnimatedPressable
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
        animatedStyle as ViewStyle,
        style,
      ]}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.MEDIUM / 2 }}
    >
      <ThemedText
        type="body"
        weight="semibold"
        style={[
          styles.buttonText,
          {
            color: colors.tint, // Always use tint color for action-oriented button
          },
        ]}
        numberOfLines={1}
      >
        {buttonText}
      </ThemedText>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: 70,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
  },
});

export default memo(EditModeButton);
