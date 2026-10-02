import { TransparentHeaderButton } from '@/components/ui';
import { memo, startTransition, useCallback, useOptimistic } from 'react';

import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useReadingListCount } from '@/hooks/playlist/useReadingListCount';
import { useEditMode } from '@/hooks/ui/useEditMode';
import type { EditModeType } from '@/store/editModeSlice';

interface EditModeButtonProps {
  /**
   * The type of edit mode this button controls
   */
  type: EditModeType;
}

/**
 * The Playlist tab's `headerRight` — toggles reorder/delete mode.
 *
 * Lives here rather than in `components/ui` because it reads playlist state and
 * Redux directly; a `components/ui` component should be driveable by props alone.
 */
const EditModeButtonComponent = ({ type }: EditModeButtonProps) => {
  const { editMode, toggle } = useEditMode(type);
  const { user } = useAuth();

  // React 19: Use native useOptimistic for immediate visual feedback
  const [optimisticEditMode, setOptimisticEditMode] = useOptimistic(
    editMode,
    (_currentState, newValue: boolean) => newValue,
  );
  const readingListCount = useReadingListCount(user?.id);

  // Simple toggle handler - single action, no menu needed
  const handleToggle = useCallback((): void => {
    const newEditMode = !optimisticEditMode;

    // React 19: Optimistic update in transition for immediate UI feedback
    startTransition(() => {
      setOptimisticEditMode(newEditMode);
    });

    toggle();
  }, [toggle, optimisticEditMode, setOptimisticEditMode]);

  // Nothing to reorder yet. Guarded only after every hook and callback above
  // has been created.
  if (readingListCount <= 0) {
    return null;
  }

  return (
    <TransparentHeaderButton
      accessibilityLabel={
        optimisticEditMode ? STRINGS.EDIT_MODE_DONE_A11Y : STRINGS.EDIT_MODE_START_A11Y
      }
      // Icon: checkmark-circle when in edit mode, pencil when not
      icon={optimisticEditMode ? 'checkmark-circle' : 'pencil'}
      onPress={handleToggle}
    />
  );
};

export const EditModeButton = memo(EditModeButtonComponent);

EditModeButton.displayName = 'EditModeButton';
