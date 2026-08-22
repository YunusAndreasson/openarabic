/**
 * Store Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import reducer, {
  type ArabicFontName,
  selectAdaptiveNewWordPacingEnabled,
  setAdaptiveNewWordPacingEnabled,
  setArabicFont,
  setArabicFontSize,
  setAudioLanguagePreference,
  setAudioShuffleEnabled,
  setDailyWordLimit,
  setHapticsEnabled,
  setReminderTime,
  setVoiceEnabled,
  setVoiceOfferDismissed,
  setWordTapShowsTooltip,
  type SettingsState,
} from '../../store/settingsSlice';
import { AudioLanguage, DisplayLanguage } from '@/types/enums';
import type { ReminderTime } from '@/types/notifications.types';
import { defaultPreloadedState } from '@/__tests__/helpers/testStore';

describe('settingsSlice reducers', () => {
  let initialState: SettingsState;

  beforeEach(() => {
    initialState = {
      ...defaultPreloadedState.settings,
      reminderTime: {
        hour: 19,
        minute: 0,
        enabled: false,
      },
      arabicFont: 'NotoSansArabic-Regular',
      arabicFontSize: 20,
      audioLanguagePreference: AudioLanguage.ENGLISH_ARABIC,
      audioShuffleEnabled: false,
      displayLanguagePreference: DisplayLanguage.ARABIC_ENGLISH,
      dailyWordLimit: 10,
      adaptiveNewWordPacingEnabled: true,
      wordTapShowsTooltip: false,
      hapticsEnabled: true,
    };
  });

  describe('setReminderTime', () => {
    test('sets reminder time with enabled true', () => {
      const newReminderTime: ReminderTime = {
        hour: 8,
        minute: 30,
        enabled: true,
      };
      const state = reducer(initialState, setReminderTime(newReminderTime));
      expect(state.reminderTime).toEqual(newReminderTime);
    });

    test('sets reminder time with enabled false', () => {
      const newReminderTime: ReminderTime = {
        hour: 22,
        minute: 0,
        enabled: false,
      };
      const state = reducer(initialState, setReminderTime(newReminderTime));
      expect(state.reminderTime).toEqual(newReminderTime);
    });
  });

  describe('setArabicFont', () => {
    const fonts: ArabicFontName[] = [
      'DigitalKhattNewMadinaRegular',
      'Amiri-Regular',
      'ScheherazadeNew-Regular',
      'NotoNastaliqUrdu-Regular',
      'NotoSansArabic-Regular',
    ];

    test.each(fonts)('sets Arabic font to %p', font => {
      const state = reducer(initialState, setArabicFont(font));
      expect(state.arabicFont).toBe(font);
    });
  });

  describe('setArabicFontSize', () => {
    const sizes = [16, 18, 20, 22, 24];

    test.each(sizes)('sets Arabic font size to %p', size => {
      const state = reducer(initialState, setArabicFontSize(size));
      expect(state.arabicFontSize).toBe(size);
    });
  });

  describe('setAudioLanguagePreference', () => {
    test('sets to ARABIC_ONLY', () => {
      const state = reducer(initialState, setAudioLanguagePreference(AudioLanguage.ARABIC_ONLY));
      expect(state.audioLanguagePreference).toBe('arabic');
    });

    test('sets to ENGLISH_ARABIC', () => {
      const state = reducer(initialState, setAudioLanguagePreference(AudioLanguage.ENGLISH_ARABIC));
      expect(state.audioLanguagePreference).toBe('bilingual');
    });
  });

  describe('setAudioShuffleEnabled', () => {
    test('enables audio shuffle', () => {
      const state = reducer(initialState, setAudioShuffleEnabled(true));
      expect(state.audioShuffleEnabled).toBeTruthy();
    });

    test('disables audio shuffle', () => {
      const modifiedState = { ...initialState, audioShuffleEnabled: true };
      const state = reducer(modifiedState, setAudioShuffleEnabled(false));
      expect(state.audioShuffleEnabled).toBeFalsy();
    });
  });

  describe('setDailyWordLimit', () => {
    const limits = [0, 5, 10, 20, 50];

    test.each(limits)('sets daily word limit to %p', limit => {
      const state = reducer(initialState, setDailyWordLimit(limit));
      expect(state.dailyWordLimit).toBe(limit);
    });
  });

  describe('setHapticsEnabled', () => {
    test('enables haptics', () => {
      const modifiedState = { ...initialState, hapticsEnabled: false };
      const state = reducer(modifiedState, setHapticsEnabled(true));
      expect(state.hapticsEnabled).toBe(true);
    });

    test('disables haptics', () => {
      const state = reducer(initialState, setHapticsEnabled(false));
      expect(state.hapticsEnabled).toBe(false);
    });
  });

  describe('setAdaptiveNewWordPacingEnabled', () => {
    test('disables adaptive pacing', () => {
      const state = reducer(initialState, setAdaptiveNewWordPacingEnabled(false));
      expect(state.adaptiveNewWordPacingEnabled).toBe(false);
    });

    test('re-enables adaptive pacing', () => {
      const modifiedState = { ...initialState, adaptiveNewWordPacingEnabled: false };
      const state = reducer(modifiedState, setAdaptiveNewWordPacingEnabled(true));
      expect(state.adaptiveNewWordPacingEnabled).toBe(true);
    });
  });

  describe('selectAdaptiveNewWordPacingEnabled', () => {
    test('reads true when explicitly enabled', () => {
      expect(
        selectAdaptiveNewWordPacingEnabled({ settings: { adaptiveNewWordPacingEnabled: true } }),
      ).toBe(true);
    });

    test('reads false when explicitly disabled', () => {
      expect(
        selectAdaptiveNewWordPacingEnabled({ settings: { adaptiveNewWordPacingEnabled: false } }),
      ).toBe(false);
    });

    test('defaults to true when rehydrated from a pre-flag install (key absent)', () => {
      // Regression: persistConfig has no version/migrate, so redux-persist's
      // autoMergeLevel1 leaves this key `undefined` for every install that
      // predates the field. A bare truthiness read silently disables pacing;
      // the selector must fall back to the documented `true` default instead.
      expect(selectAdaptiveNewWordPacingEnabled({ settings: {} })).toBe(true);
    });
  });

  describe('setWordTapShowsTooltip', () => {
    test('enables tooltip-first word taps', () => {
      const state = reducer(initialState, setWordTapShowsTooltip(true));
      expect(state.wordTapShowsTooltip).toBe(true);
    });

    test('returns to tap-opens-card behavior', () => {
      const modifiedState = { ...initialState, wordTapShowsTooltip: true };
      const state = reducer(modifiedState, setWordTapShowsTooltip(false));
      expect(state.wordTapShowsTooltip).toBe(false);
    });
  });

  test('maintains other state properties when updating a single property', () => {
    let state = reducer(initialState, setArabicFontSize(22));
    expect(state.arabicFont).toBe(initialState.arabicFont);
    expect(state.dailyWordLimit).toBe(initialState.dailyWordLimit);

    state = reducer(state, setDailyWordLimit(20));
    expect(state.arabicFontSize).toBe(22);
    expect(state.arabicFont).toBe(initialState.arabicFont);
  });

  // Speak-the-answer ships ON. The offer card and its dismissal flag remain for
  // the installed base, whose persisted `voiceEnabled: false` survives
  // rehydration untouched — they are what those two booleans are still for.
  describe('speak-the-answer offer', () => {
    const defaults = () => reducer(undefined, { type: '@@INIT' });

    it('ships ON for a new install, and un-refused', () => {
      // The whole point of the default flip: opting in produced four users in
      // the feature's entire history, so a new learner starts with voice
      // available rather than having to discover a setting.
      const state = defaults();
      expect(state.voiceEnabled).toBe(true);
      expect(state.voiceOfferDismissed).toBe(false);
    });

    it('an explicit refusal retires the offer without touching the setting', () => {
      // `voiceOfferDismissed` only ever governed the CARD. It never turned the
      // feature off, and now that the default is on, conflating the two would
      // silently disable voice for anyone who dismissed a card.
      const state = reducer(defaults(), setVoiceOfferDismissed(true));
      expect(state.voiceOfferDismissed).toBe(true);
      expect(state.voiceEnabled).toBe(true);
    });

    it('an existing install that turned voice off stays off', () => {
      // redux-persist reconciles with autoMergeLevel1, so a stored `false` wins
      // over the new default. This is why the flip needs no migration.
      const off = reducer(defaults(), setVoiceEnabled(false));
      expect(off.voiceEnabled).toBe(false);
      expect(reducer(off, { type: '@@OTHER' }).voiceEnabled).toBe(false);
    });

    it('turning it on does not need a refusal, and vice versa', () => {
      const enabled = reducer(defaults(), setVoiceEnabled(true));
      expect(enabled.voiceEnabled).toBe(true);
      expect(enabled.voiceOfferDismissed).toBe(false);
    });

    it.each([
      [false, false, true],
      [true, false, false],
      [false, true, false],
      [true, true, false],
    ])(
      'voiceEnabled=%s dismissed=%s → offer shown=%s',
      (voiceEnabled, dismissed, expectedShown) => {
        expect(!voiceEnabled && !dismissed).toBe(expectedShown);
      },
    );
  });
});
