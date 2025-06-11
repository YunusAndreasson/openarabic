import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleEditMode } from '@/store/listenSlice';
import { selectionFeedback } from '@/utils/haptics';

interface EditModeButtonProps {
  onEditModeChange?: (editMode: boolean) => void;
}

const EditModeButton: React.FC<EditModeButtonProps> = ({ onEditModeChange }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const editMode = useAppSelector(state => state.listen.editMode);

  const handlePress = React.useCallback(() => {
    selectionFeedback();
    dispatch(toggleEditMode());
    onEditModeChange?.(!editMode);
  }, [dispatch, editMode, onEditModeChange]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={editMode ? 'Exit edit mode' : 'Enter edit mode'}
      accessibilityHint={editMode ? 'Tap to finish editing' : 'Tap to edit and reorder articles'}
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
    </TouchableOpacity>
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

export default EditModeButton;
