import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { Theme } from '@/constants/Colors';
import { Colors } from '@/constants/Colors';

type ThemeColors = (typeof Colors)[Theme];

export interface ThemeState {
  theme: Theme | null;
  colors: ThemeColors;
}

const initialState: ThemeState = {
  theme: null,
  colors: Colors.light,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      state.colors = Colors[action.payload];
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
