import { describe, expect, test } from '@jest/globals';

import { FONTS } from '@/constants/fonts';
import { ARABIC_FONT_SIZE } from '@/constants/layout';
import { Theme } from '@/constants/colors';
import {
  selectArabicFont,
  selectArabicFontSize,
  selectAudioLanguage,
  selectVoiceEnabled,
  selectWordTapShowsTooltip,
} from '@/store/settingsSlice';
import { selectTheme } from '@/store/themeSlice';
import { AudioLanguage } from '@/types/enums';

describe('reading-settings selectors', () => {
  test('selectArabicFont narrows an unknown persisted face onto the default', () => {
    expect(selectArabicFont({ settings: { arabicFont: 'NoLongerShipped' } })).toBe(FONTS.ARABIC);
    expect(selectArabicFont({ settings: {} })).toBe(FONTS.ARABIC);
  });

  test('selectArabicFontSize clamps into the slider range and defaults when missing', () => {
    expect(selectArabicFontSize({ settings: { arabicFontSize: 400 } })).toBe(ARABIC_FONT_SIZE.MAX);
    expect(selectArabicFontSize({ settings: {} })).toBe(ARABIC_FONT_SIZE.DEFAULT);
  });

  test('selectAudioLanguage keeps Arabic-only and reads anything else as bilingual', () => {
    expect(selectAudioLanguage({ settings: { audioLanguagePreference: 'arabic' } })).toBe(
      AudioLanguage.ARABIC_ONLY,
    );
    expect(selectAudioLanguage({ settings: { audioLanguagePreference: 'klingon' } })).toBe(
      AudioLanguage.ENGLISH_ARABIC,
    );
    expect(selectAudioLanguage({ settings: {} })).toBe(AudioLanguage.ENGLISH_ARABIC);
  });

  test('selectWordTapShowsTooltip is on only when explicitly on', () => {
    expect(selectWordTapShowsTooltip({ settings: { wordTapShowsTooltip: true } })).toBe(true);
    expect(selectWordTapShowsTooltip({ settings: { wordTapShowsTooltip: false } })).toBe(false);
    expect(selectWordTapShowsTooltip({ settings: {} })).toBe(false);
  });

  test('selectVoiceEnabled keeps the raw reads’ behaviour: a missing key is off', () => {
    expect(selectVoiceEnabled({ settings: { voiceEnabled: true } })).toBe(true);
    expect(selectVoiceEnabled({ settings: { voiceEnabled: false } })).toBe(false);
    expect(selectVoiceEnabled({ settings: {} })).toBe(false);
  });
});

describe('selectTheme', () => {
  test('a rehydrated null reads as the shipped default', () => {
    expect(selectTheme({ theme: { theme: null } })).toBe(Theme.Dark);
    expect(selectTheme({ theme: { theme: Theme.Sepia } })).toBe(Theme.Sepia);
  });
});
