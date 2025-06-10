import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ListenState {
  editMode: boolean;
  customOrder: number[]; // Array of article IDs in user-defined order
}

const initialState: ListenState = {
  editMode: false,
  customOrder: [],
};

const listenSlice = createSlice({
  name: 'listen',
  initialState,
  reducers: {
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.editMode = action.payload;
    },
    setCustomOrder: (state, action: PayloadAction<number[]>) => {
      state.customOrder = action.payload;
    },
    removeFromCustomOrder: (state, action: PayloadAction<number>) => {
      const articleId = action.payload;
      state.customOrder = state.customOrder.filter(id => id !== articleId);
    },
    toggleEditMode: state => {
      state.editMode = !state.editMode;
    },
  },
});

export const { setEditMode, setCustomOrder, removeFromCustomOrder, toggleEditMode } =
  listenSlice.actions;

export default listenSlice.reducer;
