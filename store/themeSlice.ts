import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Colors, Theme } from '@/constants/Colors';

type ThemeColors = (typeof Colors)[Theme]; // This creates a union type of both themes

interface ThemeState {
  theme: Theme;
  colors: ThemeColors;
}

const initialState: ThemeState = {
  theme: Theme.Light,
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
