import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { Theme, Colors } from '@/constants/colors';

type ThemeColors = (typeof Colors)[Theme];

export interface ThemeState {
  theme: Theme | null;
  colors: ThemeColors;
}

const initialState: ThemeState = {
  theme: Theme.Dark, // Default to Midnight Summer (dark theme) for new users
  colors: Colors.dark,
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
