import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Colors, Theme } from '@/constants/Colors';

type ThemeColors = (typeof Colors)[Theme];

interface ThemeState {
  theme: Theme | null;
  colors: ThemeColors;
}

const initialState: ThemeState = {
  theme: null,
  colors: Colors.light,
};

console.log('Initial theme colors:', initialState.colors); // Temporary debug log

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      state.colors = Colors[action.payload];
      console.log('Theme updated:', action.payload); // Temporary debug log
      console.log('New colors:', state.colors); // Temporary debug log
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
