import { useCallback } from 'react';

import type { EditModeType } from '@/store/editModeSlice';
import { resetEditMode, toggleEditMode } from '@/store/editModeSlice';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';

/**
 * Hook for managing edit mode state for different list types
 */
export const useEditMode = (type: EditModeType) => {
  const dispatch = useAppDispatch();
  const editMode = useAppSelectorMemo(state => state.editMode[type]);

  const toggle = useCallback(() => {
    dispatch(toggleEditMode(type));
  }, [dispatch, type]);

  const reset = useCallback(() => {
    dispatch(resetEditMode(type));
  }, [dispatch, type]);

  return {
    editMode,
    toggle,
    reset,
  };
};
