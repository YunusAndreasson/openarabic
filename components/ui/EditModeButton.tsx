import React, { memo, useCallback, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { usePressAnimation } from '@/hooks/animations';
import { useBookmarksScreen } from '@/hooks/bookmarks/useBookmarksScreen';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import type { EditModeType } from '@/store/editModeSlice';
import { UiAction } from '@/types/enums';
import { createHeaderButtonStyle, createHeaderButtonTextStyle } from '@/utils/buttonStyleUtils';
import { selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple } from '@/utils/layoutUtils';

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
  const [optimisticEditMode, setOptimisticEditMode] = React.useState(editMode);

  // Sync optimistic state with actual state when it changes
  React.useEffect(() => {
    setOptimisticEditMode(editMode);
  }, [editMode]);
  // Derive count internally for listen type when not provided
  const { sortedReadingList } = useBookmarksScreen();
  const derivedCount = type === 'listen' ? sortedReadingList.length : undefined;
  const effectiveCount = itemCount ?? derivedCount ?? undefined;

  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    includeOpacity: true,
  });

  const handlePress = useCallback((): void => {
    // Optimistic update - immediately show the new state
    const newEditMode = !optimisticEditMode;
    setOptimisticEditMode(newEditMode);

    selectionFeedback();
    toggle();
    onEditModeChange?.(newEditMode);
  }, [toggle, optimisticEditMode, onEditModeChange]);

  // Guard early return only after all hooks and callbacks above have been created
  if (hideWhenEmpty && (effectiveCount ?? 0) <= 0) {
    return null;
  }

  const buttonText = optimisticEditMode
    ? UiAction.DONE
    : type === 'listen'
    ? UiAction.MANAGE
    : type === 'dictionary'
    ? UiAction.MANAGE
    : UiAction.EDIT;

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
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={createAndroidRipple(colors)}
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
  button: createHeaderButtonStyle(),
  buttonText: createHeaderButtonTextStyle(),
});

export default memo(EditModeButton);
