import { memo, startTransition, useCallback, useOptimistic, type FC } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { usePlaylistScreen } from '@/hooks/playlist/usePlaylistScreen';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { useEditMode } from '@/hooks/ui/useEditMode';
import type { EditModeType } from '@/store/editModeSlice';
import { UiAction } from '@/types/enums';
import { HEADER_BUTTON_STYLE, HEADER_BUTTON_TEXT_STYLE } from '@/utils/buttonStyleUtils';

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

const EditModeButtonComponent: FC<EditModeButtonProps> = ({
  type,
  onEditModeChange,
  style,
  itemCount,
  hideWhenEmpty = true,
}) => {
  const colors = useColors();
  const { editMode, toggle } = useEditMode(type);

  // React 19: Use native useOptimistic for immediate visual feedback
  const [optimisticEditMode, setOptimisticEditMode] = useOptimistic(
    editMode,
    (_currentState, newValue: boolean) => newValue,
  );
  // Derive count internally for listen type when not provided
  const { sortedReadingList } = usePlaylistScreen();
  const derivedCount = type === 'listen' ? sortedReadingList.length : undefined;
  const effectiveCount = itemCount ?? derivedCount ?? undefined;

  // Create press handler with optimistic state logic
  const handlePressAction = useCallback((): void => {
    const newEditMode = !optimisticEditMode;

    // React 19: Optimistic update in transition for immediate UI feedback
    startTransition(() => {
      setOptimisticEditMode(newEditMode);
    });

    // Execute other operations immediately (not in transition)
    toggle();
    onEditModeChange?.(newEditMode);
  }, [toggle, optimisticEditMode, onEditModeChange, setOptimisticEditMode]);

  // Use shared button press hook
  const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
    useButtonPress({
      onPress: handlePressAction,
      animationOptions: { type: 'card', includeOpacity: true },
    });

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
      android_ripple={rippleConfig}
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
  button: HEADER_BUTTON_STYLE,
  buttonText: HEADER_BUTTON_TEXT_STYLE,
});

export const EditModeButton = memo(EditModeButtonComponent);
