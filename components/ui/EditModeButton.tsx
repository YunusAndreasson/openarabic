import { memo, useCallback, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

  /**
   * Hide the button when there are no items to manage
   */
  hideWhenEmpty?: boolean;

  /**
   * Number of items available to manage (used with hideWhenEmpty)
   */
  itemCount?: number;
}

const EditModeButton: FC<EditModeButtonProps> = ({
  type,
  onEditModeChange,
  style,
  hideWhenEmpty = false,
  itemCount = 0,
}) => {
  const colors = useColors();
  const { editMode, toggle } = useEditMode(type);

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = useCallback(() => {
    selectionFeedback();
    toggle();
    onEditModeChange?.(!editMode);
  }, [toggle, editMode, onEditModeChange]);

  const buttonText = editMode
    ? STRINGS.DONE
    : type === 'listen'
    ? STRINGS.MANAGE
    : type === 'dictionary'
    ? STRINGS.MANAGE
    : STRINGS.EDIT;

  // Hide the button if hideWhenEmpty is true and there are no items
  if (hideWhenEmpty && itemCount === 0) {
    return null;
  }

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
        animatedStyle as ViewStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
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
    </AnimatedTouchable>
  );
};

/**
 * Wrapper component specifically for the Listen tab that automatically
 * hides the Edit/Manage button when there are no articles in the playlist
 */
export const ListenEditModeButton: FC<{
  onEditModeChange?: (editMode: boolean) => void;
  style?: ViewStyle;
}> = ({ onEditModeChange, style }) => {
  const { sortedReadingList } = useListenScreen();

  return (
    <EditModeButton
      type="listen"
      hideWhenEmpty={true}
      itemCount={sortedReadingList.length}
      onEditModeChange={onEditModeChange}
      style={style}
    />
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
