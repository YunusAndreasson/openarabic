import { memo, startTransition, useCallback, useOptimistic, type FC } from 'react';

import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { usePlaylistScreen } from '@/hooks/playlist/usePlaylistScreen';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import type { EditModeType } from '@/store/editModeSlice';

interface EditModeButtonProps {
  /**
   * The type of edit mode this button controls
   */
  type: EditModeType;

  /**
   * Optional callback when edit mode changes
   */
  onEditModeChange?: (editMode: boolean) => void;

  /** If provided, hides the button when count is 0 */
  itemCount?: number;
  /** Convenience flag to hide when empty without passing count explicitly */
  hideWhenEmpty?: boolean;
}

const EditModeButtonComponent: FC<EditModeButtonProps> = ({
  type,
  onEditModeChange,
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
  const derivedCount = type === 'playlist' ? sortedReadingList.length : undefined;
  const effectiveCount = itemCount ?? derivedCount ?? undefined;

  // Simple toggle handler - single action, no menu needed
  const handleToggle = useCallback((): void => {
    const newEditMode = !optimisticEditMode;

    // React 19: Optimistic update in transition for immediate UI feedback
    startTransition(() => {
      setOptimisticEditMode(newEditMode);
    });

    // Execute other operations immediately (not in transition)
    toggle();
    onEditModeChange?.(newEditMode);
  }, [toggle, optimisticEditMode, onEditModeChange, setOptimisticEditMode]);

  // Guard early return only after all hooks and callbacks above have been created
  if (hideWhenEmpty && (effectiveCount ?? 0) <= 0) {
    return null;
  }

  // Icon: checkmark-circle when in edit mode, pencil when not
  const iconName = optimisticEditMode ? 'checkmark-circle' : 'pencil';

  return (
    <HeaderIconButton
      iconName={iconName}
      onPress={handleToggle}
      size="medium"
      iconColor={colors.tint}
      backgroundColor={colors.transparent}
    />
  );
};

export const EditModeButton = memo(EditModeButtonComponent);
