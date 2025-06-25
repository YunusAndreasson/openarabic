import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ListenState {
  customOrder: number[]; // Array of article IDs in user-defined order
}

const initialState: ListenState = {
  customOrder: [],
};

const listenSlice = createSlice({
  name: 'listen',
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

export const { setCustomOrder, removeFromCustomOrder } = listenSlice.actions;

export default listenSlice.reducer;
