import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleEditMode } from '@/store/listenSlice';
import { selectionFeedback } from '@/utils/haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface EditModeButtonProps {
  onEditModeChange?: (editMode: boolean) => void;
}

const EditModeButton: React.FC<EditModeButtonProps> = ({ onEditModeChange }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const editMode = useAppSelector(state => state.listen.editMode);

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const handlePress = React.useCallback(() => {
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
      activeOpacity={0.6}
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
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 17,
    letterSpacing: -0.24,
  },
});

export default React.memo(EditModeButton);
