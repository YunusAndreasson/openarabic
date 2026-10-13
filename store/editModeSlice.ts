import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';

// Dictionary edit mode was retired when the wordlist moved to swipe actions;
// playlist is the only list with an edit mode today.
export type EditModeType = 'playlist';

export interface EditModeState {
  playlist: boolean;
}

const initialState: EditModeState = {
  playlist: false,
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
  extraReducers: builder => {
    // Older installs persisted this temporary UI state. A fresh object tells
    // redux-persist's reconciler to skip that legacy slice during startup.
    builder.addCase(REHYDRATE, () => ({ ...initialState }));
  },
});

export const { toggleEditMode, resetEditMode } = editModeSlice.actions;

export default editModeSlice.reducer;
