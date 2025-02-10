import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Colors } from '@/constants/Colors';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  colors: typeof Colors.light;
}

const initialState: ThemeState = {
  theme: 'light',
  colors: Colors.light,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      // state.colors = Colors[action.payload]; // Enable when testing colors
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
