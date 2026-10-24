import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { resolveArabicFont, type ArabicFontName } from '@/constants/fonts';
import { ARABIC_FONT_SIZE, clampArabicFontSize } from '@/constants/layout';
import { AudioLanguage } from '@/types/enums';
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
  dailyWordLimit: 10, // Default to 10 words per day for getting started
  adaptiveNewWordPacingEnabled: true, // Default on; eases new words when recall dips
  wordTapShowsTooltip: false, // Default: tap a word to open its card directly (discoverable)
  hapticsEnabled: true, // Default to enabled for haptic feedback
  /**
   * ON by default for new installs — speaking the answer is the point of the
   * product, not a power-user extra, and opt-in had produced four users in the
   * feature's entire history.
   *
   * Only a genuinely new install reads this `true`. An existing install's
   * persisted `false` wins over it on rehydrate, so that learner keeps the
   * offer card. An install whose settings predate the field is pinned to
   * `false` by persist migration 2 (store/persistConfig.ts): the slice now
   * merges onto this initial state, and without the pin those learners would
   * have had voice, and the model prefetch, switched on with no say in it.
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
 * Read through this rather than off `state.settings.hapticsEnabled` directly.
 * The `settings` slice has been in the redux-persist whitelist since
 * 2025-02-19, but `hapticsEnabled` was only added on 2025-11-05, and until
 * `persistConfig` gained `autoMergeLevel2` (store/persistConfig.ts) a key
 * missing from the stored slice rehydrated as `undefined`. A truthiness check
 * therefore turned haptics OFF, permanently and silently, for every install
 * that predated the flag, with the settings toggle rendering as off to match.
 * A fresh install can never reproduce it, which is why it went unnoticed.
 *
 * Rehydration now fills a missing key from `initialState`, so these reads are
 * belt and braces. They stay because they cost nothing and give the same
 * answer either way.
 *
 * The parameter is typed as a partial rather than as `SettingsState`, so the
 * `!== false` reads as the deliberate default it is rather than as a redundant
 * boolean comparison. Narrow rather than RootState so this file stays out of
 * the store's import graph; RootState satisfies it structurally.
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
 * redux-persist whitelist. Until the reconciler change, every install that
 * predated that commit rehydrated this key as `undefined`, and
 * `useDailyWordLimit`'s `if (!adaptivePacingEnabled)` read that as "off", silently
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
 * persisted `settings` predated the fields, `undefined` overwrote the shipped
 * `true`: the energy gate and gain normalization ran off, and the Advanced
 * toggles rendered off to match. Route every read through these.
 *
 * These four recording knobs are developer controls: the Advanced screen that
 * sets them exists only in development builds. A production build therefore
 * reads the shipped value whatever is persisted, so a learner who flipped one
 * while the screen was public is not stuck with it and has no way back. The
 * stored value is left alone; a development build still sees it.
 */
const selectEnergyGateAsStored = selectDefaultTrueSetting('voiceEnergyGateEnabled');
const selectGainNormalizeAsStored = selectDefaultTrueSetting('voiceGainNormalizeEnabled');

export const selectVoiceEnergyGateEnabled = (state: RehydratedSettingsState): boolean =>
  __DEV__ ? selectEnergyGateAsStored(state) : initialState.voiceEnergyGateEnabled;

export const selectVoiceGainNormalizeEnabled = (state: RehydratedSettingsState): boolean =>
  __DEV__ ? selectGainNormalizeAsStored(state) : initialState.voiceGainNormalizeEnabled;

interface DeveloperVoiceSettingsState {
  settings: Partial<Pick<SettingsState, 'voiceIosRawMode' | 'voiceDebugEnabled'>>;
}

/** iOS 'measurement' capture mode. Off (the shipped value) outside development. */
export const selectVoiceIosRawMode = (state: DeveloperVoiceSettingsState): boolean =>
  __DEV__ ? state.settings.voiceIosRawMode === true : initialState.voiceIosRawMode;

/** The in-review voice debug HUD. Off (the shipped value) outside development. */
export const selectVoiceDebugEnabled = (state: DeveloperVoiceSettingsState): boolean =>
  __DEV__ ? state.settings.voiceDebugEnabled === true : initialState.voiceDebugEnabled;

/**
 * And once more for hands-free, which ships on. Before the reconciler change,
 * every install that predated it rehydrated the key as `undefined`; read raw,
 * that would have landed the existing user base — the people who have already
 * learned to speak their answers — on the tap-to-answer path the feature exists
 * to remove, with the toggle showing off to match.
 */
export const selectVoiceHandsFree = selectDefaultTrueSetting('voiceHandsFree');

/**
 * The reading settings, normalised once instead of at every reader.
 *
 * `resolveArabicFont` and `clampArabicFontSize` were each called at four sites,
 * every one with its own comment re-explaining the rehydration hazard; the audio
 * language was normalised at two and read raw at four more. A persisted value
 * from an older build (a font this build no longer ships, a size outside the
 * slider's range, an unknown language) is narrowed here, so no reader can see it.
 */
export const selectArabicFont = (state: { settings: { arabicFont?: unknown } }): ArabicFontName =>
  resolveArabicFont(state.settings.arabicFont);

export const selectArabicFontSize = (state: {
  settings: { arabicFontSize?: number | null };
}): number => clampArabicFontSize(state.settings.arabicFontSize);

/** Arabic-only, or bilingual for anything else — the same rule the account row displays. */
export const selectAudioLanguage = (state: {
  settings: { audioLanguagePreference?: unknown };
}): AudioLanguage =>
  state.settings.audioLanguagePreference === AudioLanguage.ARABIC_ONLY
    ? AudioLanguage.ARABIC_ONLY
    : AudioLanguage.ENGLISH_ARABIC;

/** Off unless the learner turned it on; a store from before the flag reads off, its default. */
export const selectWordTapShowsTooltip = (state: {
  settings: { wordTapShowsTooltip?: boolean };
}): boolean => state.settings.wordTapShowsTooltip === true;

/**
 * Whether voice answers are on.
 *
 * Read raw at seven sites before this, where a key missing from an older store
 * read `undefined` — off. `=== true` keeps exactly that behaviour; the
 * versioned persist migration is what decides the value for those installs.
 */
export const selectVoiceEnabled = (state: { settings: { voiceEnabled?: boolean } }): boolean =>
  state.settings.voiceEnabled === true;

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
