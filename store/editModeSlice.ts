import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type EditModeType = 'listen';

export interface EditModeState {
  listen: boolean;
}

const initialState: EditModeState = {
  listen: false,
};

const editModeSlice = createSlice({
  name: 'editMode',
  initialState,
  reducers: {
    toggleEditMode: (state, action: PayloadAction<EditModeType>) => {
      const modeType = action.payload;
      state[modeType] = !state[modeType];
    },
    setEditMode: (state, action: PayloadAction<{ type: EditModeType; enabled: boolean }>) => {
      const { type, enabled } = action.payload;
      state[type] = enabled;
    },
    resetEditMode: (state, action: PayloadAction<EditModeType>) => {
      const modeType = action.payload;
      state[modeType] = false;
    },
    resetAllEditModes: state => {
      state.listen = false;
    },
  },
});

export const { toggleEditMode, setEditMode, resetEditMode, resetAllEditModes } =
  editModeSlice.actions;

export default editModeSlice.reducer;
