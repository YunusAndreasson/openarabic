import { memo, useCallback, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
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
}

const EditModeButton: FC<EditModeButtonProps> = ({ type, onEditModeChange, style }) => {
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

  const buttonText = editMode ? STRINGS.DONE : STRINGS.EDIT;

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
        weight="medium"
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
