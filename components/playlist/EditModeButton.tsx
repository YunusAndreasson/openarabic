import { TransparentHeaderButton } from '@/components/ui';
import { memo } from 'react';

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
  // `editMode` directly. It went through useOptimistic + startTransition, but
  // the toggle is a synchronous Redux dispatch: the store value is already the
  // new one on the next render, so there was nothing to be optimistic about.
  const { editMode, toggle } = useEditMode(type);
  const { user } = useAuth();
  const readingListCount = useReadingListCount(user?.id);

  // Nothing to reorder yet. Guarded only after every hook above has run.
  if (readingListCount <= 0) {
    return null;
  }

  return (
    <TransparentHeaderButton
      accessibilityLabel={editMode ? STRINGS.EDIT_MODE_DONE_A11Y : STRINGS.EDIT_MODE_START_A11Y}
      // Icon: checkmark-circle when in edit mode, pencil when not
      icon={editMode ? 'checkmark-circle' : 'pencil'}
      onPress={toggle}
    />
  );
};

export const EditModeButton = memo(EditModeButtonComponent);

EditModeButton.displayName = 'EditModeButton';
