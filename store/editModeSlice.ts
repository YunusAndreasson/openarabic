import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type EditModeType = 'playlist' | 'dictionary';

export interface EditModeState {
  playlist: boolean;
  dictionary: boolean;
}

const initialState: EditModeState = {
  playlist: false,
  dictionary: false,
};

const editModeSlice = createSlice({
  name: 'editMode',
  initialState,
  reducers: {
    toggleEditMode: (state, action: PayloadAction<EditModeType>) => {
      const type = action.payload;
      state[type] = !state[type];
    },
    resetEditMode: (state, action: PayloadAction<EditModeType>) => {
      const type = action.payload;
      state[type] = false;
    },
  },
});

export const { toggleEditMode, resetEditMode } = editModeSlice.actions;

export default editModeSlice.reducer;
