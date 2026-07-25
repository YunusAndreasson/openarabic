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
  adaptiveNewWordPacingEnabled: boolean; // Throttle new-word adds when recent recall dips
  // When true, tapping a word in an article shows the lightweight inline tooltip
  // first (full word card on a second tap). Default false: tap opens the word
  // card directly, so the feature is discoverable without the extra tap. Opt-in
  // once the user knows the card is there.
  wordTapShowsTooltip: boolean;
  hapticsEnabled: boolean; // Vibration for button presses and interactions
  voiceEnabled: boolean; // Speak the English answer in Practice
  /**
   * The learner explicitly refused the speak-the-answer offer on the practice
   * screen. Until then the offer is shown every visit — it's a flagship
   * feature, so it keeps asking rather than snoozing itself. Only an explicit
   * "No thanks" retires it; Settings remains the way to turn the feature on
   * later.
   */
  voiceOfferDismissed: boolean;
  // Advanced voice-grading knobs (Account → Advanced). Defaults mirror
  // DEFAULT_RECORDING_CONFIG; surfaced so quiet-capture issues can be tuned /
  // A-B tested on-device without a rebuild.
  voiceEnergyGateEnabled: boolean; // Auto-stop recording on trailing silence
  voiceGainNormalizeEnabled: boolean; // Peak-normalize the waveform before ASR
  voiceIosRawMode: boolean; // iOS 'measurement' session mode (raw, no AGC)
  voiceDebugEnabled: boolean; // Show the in-review voice debug HUD
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
  adaptiveNewWordPacingEnabled: true, // Default on; eases new words when recall dips
  wordTapShowsTooltip: false, // Default: tap a word to open its card directly (discoverable)
  hapticsEnabled: true, // Default to enabled for haptic feedback
  voiceEnabled: false, // Opt-in; downloads a ~103 MB model on enable
  voiceOfferDismissed: false,
  voiceEnergyGateEnabled: true,
  voiceGainNormalizeEnabled: true,
  voiceIosRawMode: false,
  voiceDebugEnabled: false,
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
    setAdaptiveNewWordPacingEnabled: (state, action: PayloadAction<boolean>) => {
      state.adaptiveNewWordPacingEnabled = action.payload;
    },
    setWordTapShowsTooltip: (state, action: PayloadAction<boolean>) => {
      state.wordTapShowsTooltip = action.payload;
    },
    setHapticsEnabled: (state, action: PayloadAction<boolean>) => {
      state.hapticsEnabled = action.payload;
    },
    setVoiceEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceEnabled = action.payload;
    },
    setVoiceOfferDismissed: (state, action: PayloadAction<boolean>) => {
      state.voiceOfferDismissed = action.payload;
    },
    setVoiceEnergyGateEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceEnergyGateEnabled = action.payload;
    },
    setVoiceGainNormalizeEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceGainNormalizeEnabled = action.payload;
    },
    setVoiceIosRawMode: (state, action: PayloadAction<boolean>) => {
      state.voiceIosRawMode = action.payload;
    },
    setVoiceDebugEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceDebugEnabled = action.payload;
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
  setAdaptiveNewWordPacingEnabled,
  setWordTapShowsTooltip,
  setHapticsEnabled,
  setVoiceEnabled,
  setVoiceOfferDismissed,
  setVoiceEnergyGateEnabled,
  setVoiceGainNormalizeEnabled,
  setVoiceIosRawMode,
  setVoiceDebugEnabled,
} = settingsSlice.actions;
export default settingsSlice.reducer;
