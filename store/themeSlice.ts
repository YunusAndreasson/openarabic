import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Colors } from '@/constants/Colors';

export type ThemeState = {
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
};

const initialState: ThemeState = {
  isDark: false,
  colors: Colors.light,
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: state => {
      state.isDark = !state.isDark;
      state.colors = state.isDark ? Colors.dark : Colors.light;
    },
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.isDark = action.payload;
      state.colors = action.payload ? Colors.dark : Colors.light;
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
