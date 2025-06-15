import { memo, useCallback, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import {
  LAYOUT,
  MIN_TOUCH_TARGET,
  TYPOGRAPHY_HIERARCHY,
} from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import { toggleEditMode } from '@/store/listenSlice';
import { selectionFeedback } from '@/utils/haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface EditModeButtonProps {
  onEditModeChange?: (editMode: boolean) => void;
}

const EditModeButton: FC<EditModeButtonProps> = ({ onEditModeChange }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const editMode = useAppSelectorMemo(state => state.listen.editMode);

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = useCallback(() => {
    selectionFeedback();
    dispatch(toggleEditMode());
    onEditModeChange?.(!editMode);
  }, [dispatch, editMode, onEditModeChange]);

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
        animatedStyle as ViewStyle,
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
      >
        {editMode ? 'Done' : 'Edit'}
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
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
  },
});

export default memo(EditModeButton);
