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
  setArabicFont,
  setArabicFontSize,
  setAudioLanguagePreference,
  setAudioShuffleEnabled,
  setDailyWordLimit,
  setDisplayLanguagePreference,
  setReminderTime,
  type SettingsState,
} from '../../store/settingsSlice';
import { AudioLanguage, DisplayLanguage } from '@/types/enums';
import type { ReminderTime } from '@/types/notifications.types';

describe('settingsSlice reducers', () => {
  let initialState: SettingsState;

  beforeEach(() => {
    initialState = {
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
    test('sets to ENGLISH', () => {
      const state = reducer(initialState, setAudioLanguagePreference(AudioLanguage.ENGLISH));
      expect(state.audioLanguagePreference).toBe(AudioLanguage.ENGLISH);
    });

    test('sets to ARABIC', () => {
      const state = reducer(initialState, setAudioLanguagePreference(AudioLanguage.ARABIC));
      expect(state.audioLanguagePreference).toBe(AudioLanguage.ARABIC);
    });

    test('sets to ENGLISH_ARABIC', () => {
      const state = reducer(initialState, setAudioLanguagePreference(AudioLanguage.ENGLISH_ARABIC));
      expect(state.audioLanguagePreference).toBe(AudioLanguage.ENGLISH_ARABIC);
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

  describe('setDisplayLanguagePreference', () => {
    test('sets to ARABIC', () => {
      const state = reducer(initialState, setDisplayLanguagePreference(DisplayLanguage.ARABIC));
      expect(state.displayLanguagePreference).toBe(DisplayLanguage.ARABIC);
    });

    test('sets to ENGLISH', () => {
      const state = reducer(initialState, setDisplayLanguagePreference(DisplayLanguage.ENGLISH));
      expect(state.displayLanguagePreference).toBe(DisplayLanguage.ENGLISH);
    });

    test('sets to ARABIC_ENGLISH', () => {
      const state = reducer(
        initialState,
        setDisplayLanguagePreference(DisplayLanguage.ARABIC_ENGLISH),
      );
      expect(state.displayLanguagePreference).toBe(DisplayLanguage.ARABIC_ENGLISH);
    });
  });

  describe('setDailyWordLimit', () => {
    const limits = [0, 5, 10, 20, 50];

    test.each(limits)('sets daily word limit to %p', limit => {
      const state = reducer(initialState, setDailyWordLimit(limit));
      expect(state.dailyWordLimit).toBe(limit);
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
});
