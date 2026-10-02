import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { ArabicFontName } from '@/constants/fonts';
import { ARABIC_FONT_SIZE, clampArabicFontSize } from '@/constants/layout';
import { AudioLanguage, DisplayLanguage } from '@/types/enums';
import type { ReminderTime } from '@/types/notifications.types';

// Re-exported from the font constants, which own the list `useFonts` registers
// and the resolver that narrows a persisted name back onto it.
export type { ArabicFontName };

export interface SettingsState {
  reminderTime: ReminderTime;
  arabicFont: ArabicFontName;
  arabicFontSize: number;
  audioLanguagePreference: AudioLanguage;
  audioShuffleEnabled: boolean;
  /**
   * Retained for rehydration compatibility only — the setting had no reader
   * outside its own picker, so the control was removed rather than left
   * pretending to do something. `persistConfig` has no migrate, so the field
   * stays in the shape.
   */
  displayLanguagePreference: DisplayLanguage;
  dailyWordLimit: number; // Number of words that can be added per day (0 = unlimited)
  adaptiveNewWordPacingEnabled: boolean; // Throttle new-word adds when recent recall dips
  // When true, tapping a word in an article shows the lightweight inline tooltip
  // first (full word card on a second tap). Default false: tap opens the word
  // card directly, so the feature is discoverable without the extra tap. Opt-in
  // once the user knows the card is there.
  wordTapShowsTooltip: boolean;
  hapticsEnabled: boolean; // Vibration for button presses and interactions
  voiceEnabled: boolean; // Speak the English answer in Practice. Default ON — see initialState.
  /**
   * The learner explicitly refused the speak-the-answer offer on the practice
   * screen. Until then the offer is shown every visit — it's a flagship
   * feature, so it keeps asking rather than snoozing itself. Only an explicit
   * "No thanks" retires it; Settings remains the way to turn the feature on
   * later.
   */
  voiceOfferDismissed: boolean;
  /**
   * The microphone opens itself once the Arabic prompt has finished, and the
   * learner just answers. Default ON — see initialState.
   *
   * Off restores the explicit "Speak to answer" button, which is what a learner
   * in a shared room or on a bus wants: an unattended microphone is the right
   * default only where speaking aloud is already the plan. Nothing else about
   * grading changes — the same detector, the same window, only who opens it.
   */
  voiceHandsFree: boolean;
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
  arabicFontSize: ARABIC_FONT_SIZE.DEFAULT,
  audioLanguagePreference: AudioLanguage.ENGLISH_ARABIC, // Default to English + Arabic
  audioShuffleEnabled: false, // Default to sequential playback
  displayLanguagePreference: DisplayLanguage.ARABIC_ENGLISH, // Default to Arabic + English
  dailyWordLimit: 10, // Default to 10 words per day for getting started
  adaptiveNewWordPacingEnabled: true, // Default on; eases new words when recall dips
  wordTapShowsTooltip: false, // Default: tap a word to open its card directly (discoverable)
  hapticsEnabled: true, // Default to enabled for haptic feedback
  /**
   * ON by default for new installs — speaking the answer is the point of the
   * product, not a power-user extra, and opt-in had produced four users in the
   * feature's entire history.
   *
   * NO MIGRATION IS NEEDED, and adding one would be wrong. redux-persist
   * reconciles with autoMergeLevel1, so an existing install's persisted `false`
   * survives untouched and that learner keeps today's offer card. Only a
   * genuinely new install — or one predating the field — reads this `true`.
   *
   * Flipping this does NOT start a download by itself: the bytes are fetched by
   * `useVoiceModelPrefetch` on Wi-Fi only, and the recognizer is only built once
   * something retains it (see `acquireEngine`).
   */
  voiceEnabled: true,
  voiceOfferDismissed: false,
  voiceHandsFree: true,
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
      state.arabicFontSize = clampArabicFontSize(action.payload);
    },
    setAudioLanguagePreference: (state, action: PayloadAction<AudioLanguage>) => {
      state.audioLanguagePreference = action.payload;
    },
    setAudioShuffleEnabled: (state, action: PayloadAction<boolean>) => {
      state.audioShuffleEnabled = action.payload;
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
    setVoiceHandsFree: (state, action: PayloadAction<boolean>) => {
      state.voiceHandsFree = action.payload;
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

/**
 * Whether haptic feedback is on.
 *
 * Read through this rather than off `state.settings.hapticsEnabled` directly:
 * the key is ABSENT from state persisted before it existed. The `settings`
 * slice has been in the redux-persist whitelist since 2025-02-19, but
 * `hapticsEnabled` was only added on 2025-11-05, and `persistConfig` carries no
 * `version`/`migrate` — so redux-persist's default `autoMergeLevel1` hands back
 * the stored slice verbatim and the key reads `undefined`. A truthiness check
 * therefore turned haptics OFF, permanently and silently, for every install
 * that predates the flag, with the settings toggle rendering as off to match.
 * A fresh install can never reproduce it, which is why it went unnoticed.
 *
 * The parameter is typed to the REHYDRATED reality rather than to
 * `SettingsState`: the declared type says `boolean`, which is a lie for any
 * store that has been rehydrated from a pre-flag payload, and typing it that
 * way makes the `!== false` read as a redundant boolean comparison when it is
 * the entire point. Narrow rather than RootState so this file stays out of the
 * store's import graph; RootState satisfies it structurally.
 */
type DefaultTrueSetting =
  | 'hapticsEnabled'
  | 'adaptiveNewWordPacingEnabled'
  | 'voiceEnergyGateEnabled'
  | 'voiceGainNormalizeEnabled'
  | 'voiceHandsFree';

interface RehydratedSettingsState {
  settings: Partial<Pick<SettingsState, DefaultTrueSetting>>;
}

const selectDefaultTrueSetting =
  (setting: DefaultTrueSetting) =>
  (state: RehydratedSettingsState): boolean =>
    state.settings[setting] !== false;

export const selectHapticsEnabled = selectDefaultTrueSetting('hapticsEnabled');

/**
 * The saved daily new-word limit (0 = unlimited), falling back to the shipped
 * default when the persisted value is missing or malformed.
 */
export const selectDailyWordLimit = (state: { settings: { dailyWordLimit?: unknown } }): number => {
  const limit = state.settings.dailyWordLimit;
  return typeof limit === 'number' && limit >= 0 ? limit : initialState.dailyWordLimit;
};

/**
 * Same rehydration hazard as {@link selectHapticsEnabled}: `adaptiveNewWordPacingEnabled`
 * was added in `12f21454` (FSRS learning port), well after `settings` joined the
 * redux-persist whitelist, and `persistConfig` still carries no `version`/`migrate`.
 * Every install that predates that commit rehydrates this key as `undefined`, and
 * `useDailyWordLimit`'s `if (!adaptivePacingEnabled)` reads that as "off" — silently
 * disabling retention-gated pacing (and showing the toggle off) for every existing
 * user despite the field's documented default of `true`. Read through this selector
 * instead of the raw slice field so undefined maps back to the intended default.
 */
export const selectAdaptiveNewWordPacingEnabled = selectDefaultTrueSetting(
  'adaptiveNewWordPacingEnabled',
);

/**
 * Same hazard again, and this pair was still reading raw. `VoiceGradingProvider`
 * spreads these over `DEFAULT_RECORDING_CONFIG`, so on any install whose
 * persisted `settings` predates the fields, `undefined` overwrites the shipped
 * `true` — the energy gate and gain normalization run off, and the Advanced
 * toggles render off to match. Route every read through these.
 */
export const selectVoiceEnergyGateEnabled = selectDefaultTrueSetting('voiceEnergyGateEnabled');

export const selectVoiceGainNormalizeEnabled = selectDefaultTrueSetting(
  'voiceGainNormalizeEnabled',
);

/**
 * And once more for hands-free, which ships on. Every install that predates it
 * rehydrates the key as `undefined`; read raw, that would land the existing user
 * base — the people who have already learned to speak their answers — on the
 * tap-to-answer path the feature exists to remove, with the toggle showing off
 * to match.
 */
export const selectVoiceHandsFree = selectDefaultTrueSetting('voiceHandsFree');

export const {
  setReminderTime,
  setArabicFont,
  setArabicFontSize,
  setAudioLanguagePreference,
  setAudioShuffleEnabled,
  setDailyWordLimit,
  setAdaptiveNewWordPacingEnabled,
  setWordTapShowsTooltip,
  setHapticsEnabled,
  setVoiceEnabled,
  setVoiceOfferDismissed,
  setVoiceHandsFree,
  setVoiceEnergyGateEnabled,
  setVoiceGainNormalizeEnabled,
  setVoiceIosRawMode,
  setVoiceDebugEnabled,
} = settingsSlice.actions;
export default settingsSlice.reducer;
