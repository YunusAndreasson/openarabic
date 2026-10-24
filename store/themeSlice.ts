import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { Theme } from '@/constants/colors';

export interface ThemeState {
  theme: Theme | null;
}

const initialState: ThemeState = {
  theme: Theme.Dark, // Default to Midnight Summer (dark theme) for new users
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
  },
});

/**
 * The theme to paint in. The state type allows `null` (redux-persist can hand
 * one back from an old store), and that reads as the shipped default — the one
 * fallback rule, instead of a different one at each reader.
 */
export const selectTheme = (state: { theme: ThemeState }): Theme => state.theme.theme ?? Theme.Dark;

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
