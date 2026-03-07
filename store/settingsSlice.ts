import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { LAYOUT } from '@/constants/layout';
import { AudioLanguage, DisplayLanguage } from '@/types/enums';
import type { ReminderTime } from '@/types/notifications.types';

export type ArabicFontName =
  | 'DigitalKhattNewMadinaRegular'
  | 'Amiri-Regular'
  | 'ScheherazadeNew-Regular'
  | 'NotoNastaliqUrdu-Regular'
  | 'NotoSansArabic-Regular';

export interface SettingsState {
  reminderTime: ReminderTime;
  arabicFont: ArabicFontName;
  arabicFontSize: number;
  audioLanguagePreference: AudioLanguage;
  audioShuffleEnabled: boolean;
  displayLanguagePreference: DisplayLanguage;
  dailyWordLimit: number; // Number of words that can be added per day (0 = unlimited)
  hapticsEnabled: boolean; // Vibration for button presses and interactions
}

const initialState: SettingsState = {
  reminderTime: {
    hour: 19, // 7 PM default
    minute: 0,
    enabled: false,
  },
  arabicFont: 'NotoSansArabic-Regular', // Default font
  arabicFontSize: LAYOUT.TYPOGRAPHY.SCALE.DEFAULT_ARABIC, // Default to 24px (slightly above average of 13-40px range)
  audioLanguagePreference: AudioLanguage.ENGLISH_ARABIC, // Default to English + Arabic
  audioShuffleEnabled: false, // Default to sequential playback
  displayLanguagePreference: DisplayLanguage.ARABIC_ENGLISH, // Default to Arabic + English
  dailyWordLimit: 10, // Default to 10 words per day for getting started
  hapticsEnabled: true, // Default to enabled for haptic feedback
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
    setAudioLanguagePreference: (state, action: PayloadAction<AudioLanguage>) => {
      state.audioLanguagePreference = action.payload;
    },
    setAudioShuffleEnabled: (state, action: PayloadAction<boolean>) => {
      state.audioShuffleEnabled = action.payload;
    },
    setDisplayLanguagePreference: (state, action: PayloadAction<DisplayLanguage>) => {
      state.displayLanguagePreference = action.payload;
    },
    setDailyWordLimit: (state, action: PayloadAction<number>) => {
      state.dailyWordLimit = action.payload;
    },
    setHapticsEnabled: (state, action: PayloadAction<boolean>) => {
      state.hapticsEnabled = action.payload;
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
  setHapticsEnabled,
} = settingsSlice.actions;
export default settingsSlice.reducer;
