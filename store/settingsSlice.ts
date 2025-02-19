import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  fontScale: number;
  showEnglish: boolean;
}

const initialState: SettingsState = {
  fontScale: 1,
  showEnglish: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setFontScale: (state, action: PayloadAction<number>) => {
      state.fontScale = action.payload;
    },
    setShowEnglish: (state, action: PayloadAction<boolean>) => {
      state.showEnglish = action.payload;
    },
  },
});

export const { setFontScale, setShowEnglish } = settingsSlice.actions;
export default settingsSlice.reducer;
