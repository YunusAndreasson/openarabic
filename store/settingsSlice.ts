import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { LAYOUT } from '@/constants/layout';
import type { ReminderTime } from '@/types/notifications.types';

export type ArabicFontName = 'Madina' | 'Amiri' | 'Scheherazade' | 'Nastaliq' | 'NotoSans';

export type AudioLanguagePreference = 'arabic' | 'bilingual';
export type DisplayLanguagePreference = 'arabic' | 'bilingual';

export interface SettingsState {
  fontScale: number;
  reminderTime: ReminderTime;
  arabicFont: ArabicFontName;
  arabicFontSize: number;
  audioLanguagePreference: AudioLanguagePreference;
  audioShuffleEnabled: boolean;
  displayLanguagePreference: DisplayLanguagePreference;
  dailyWordLimit: number; // Number of words that can be added per day (0 = unlimited)
}

const initialState: SettingsState = {
  fontScale: 1,
  reminderTime: {
    hour: 19, // 7 PM default
    minute: 0,
    enabled: false,
  },
  arabicFont: 'NotoSans', // Default font
  arabicFontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE, // Default to 20px
  audioLanguagePreference: 'bilingual', // Default to English + Arabic
  audioShuffleEnabled: false, // Default to sequential playback
  displayLanguagePreference: 'bilingual', // Default to Arabic + English
  dailyWordLimit: 10, // Default to 10 words per day for getting started
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
    setAudioLanguagePreference: (state, action: PayloadAction<AudioLanguagePreference>) => {
      state.audioLanguagePreference = action.payload;
    },
    setAudioShuffleEnabled: (state, action: PayloadAction<boolean>) => {
      state.audioShuffleEnabled = action.payload;
    },
    setDisplayLanguagePreference: (state, action: PayloadAction<DisplayLanguagePreference>) => {
      state.displayLanguagePreference = action.payload;
    },
    setDailyWordLimit: (state, action: PayloadAction<number>) => {
      state.dailyWordLimit = action.payload;
    },
  },
});

export const {
  setReminderTime,
  setArabicFont,
  setArabicFontSize,
  setAudioLanguagePreference,
  setAudioShuffleEnabled,
  setDisplayLanguagePreference,
  setDailyWordLimit,
} = settingsSlice.actions;
export default settingsSlice.reducer;
