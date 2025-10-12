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

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
