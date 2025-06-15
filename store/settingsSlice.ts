import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { LAYOUT } from '@/constants/layout';
import type { ReminderTime } from '@/types/notifications.types';

export type ArabicFontName = 'Madina' | 'Amiri' | 'Scheherazade' | 'Nastaliq' | 'NotoSans';

export interface SettingsState {
  fontScale: number;
  showEnglish: boolean;
  reminderTime: ReminderTime;
  arabicFont: ArabicFontName;
  arabicFontSize: number;
}

const initialState: SettingsState = {
  fontScale: 1,
  showEnglish: true,
  reminderTime: {
    hour: 19, // 7 PM default
    minute: 0,
    enabled: false,
  },
  arabicFont: 'Madina', // Default font
  arabicFontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE, // Default to 17px
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setReminderTime: (state, action: PayloadAction<ReminderTime>) => {
      state.reminderTime = action.payload;
    },
    setArabicFont: (state, action: PayloadAction<ArabicFontName>) => {
      state.arabicFont = action.payload;
    },
    setArabicFontSize: (state, action: PayloadAction<number>) => {
      state.arabicFontSize = action.payload;
    },
  },
});

export const { setReminderTime, setArabicFont, setArabicFontSize } = settingsSlice.actions;
export default settingsSlice.reducer;
