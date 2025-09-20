import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface BookmarksState {
  customOrder: number[]; // Array of article IDs in user-defined order
}

const initialState: BookmarksState = {
  customOrder: [],
};

const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    setCustomOrder: (state, action: PayloadAction<number[]>) => {
      state.customOrder = action.payload;
    },
    removeFromCustomOrder: (state, action: PayloadAction<number>) => {
      const articleId = action.payload;
      state.customOrder = state.customOrder.filter(id => id !== articleId);
    },
  },
});

export const { setCustomOrder, removeFromCustomOrder } = playlistSlice.actions;

export default playlistSlice.reducer;
