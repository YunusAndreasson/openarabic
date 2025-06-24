import { useCallback, useMemo } from 'react';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setArabicFont, setArabicFontSize, type ArabicFontName } from '@/store/settingsSlice';

export interface ArabicFontOption {
  name: ArabicFontName;
  displayName: string;
  description: string;
  previewText: string;
}

export const ARABIC_FONT_OPTIONS: ArabicFontOption[] = [
  {
    name: 'Madina',
    displayName: STRINGS.FONT_MADINA,
    description: STRINGS.FONT_MADINA_DESCRIPTION,
    previewText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  },
  {
    name: 'Amiri',
    displayName: STRINGS.FONT_AMIRI,
    description: STRINGS.FONT_AMIRI_DESCRIPTION,
    previewText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  },
  {
    name: 'Scheherazade',
    displayName: STRINGS.FONT_SCHEHERAZADE,
    description: STRINGS.FONT_SCHEHERAZADE_DESCRIPTION,
    previewText: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ',
  },
  {
    name: 'Nastaliq',
    displayName: STRINGS.FONT_NASTALIQ,
    description: STRINGS.FONT_NASTALIQ_DESCRIPTION,
    previewText: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  },
  {
    name: 'NotoSans',
    displayName: STRINGS.FONT_NOTO_SANS,
    description: STRINGS.FONT_NOTO_SANS_DESCRIPTION,
    previewText: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
  },
];

// Font size range - following Miller's Law (5-9 options)
export const FONT_SIZE_RANGE = {
  MIN: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // 13px
  MAX: LAYOUT.TYPOGRAPHY.SCALE.HUGE, // 28px
  DEFAULT: LAYOUT.TYPOGRAPHY.SCALE.LARGE, // 17px
  STEP: 1, // 1px increments for fine control
} as const;

export interface UseArabicFontSelectorResult {
  selectedFont: ArabicFontName;
  selectedFontSize: number;
  fontOptions: ArabicFontOption[];
  selectFont: (fontName: ArabicFontName) => void;
  setFontSize: (size: number) => void;
  getSelectedFontOption: () => ArabicFontOption;
  fontSizeRange: typeof FONT_SIZE_RANGE;
}

export const useArabicFontSelector = (): UseArabicFontSelectorResult => {
  const dispatch = useAppDispatch();
  const selectedFont = useAppSelector(state => state.settings.arabicFont);
  const selectedFontSize = useAppSelector(state => state.settings.arabicFontSize);

  const selectFont = useCallback(
    (fontName: ArabicFontName) => {
      dispatch(setArabicFont(fontName));
    },
    [dispatch]
  );

  const setFontSize = useCallback(
    (size: number) => {
      // Ensure size is within bounds
      const clampedSize = Math.max(
        FONT_SIZE_RANGE.MIN,
        Math.min(FONT_SIZE_RANGE.MAX, Math.round(size))
      );
      dispatch(setArabicFontSize(clampedSize));
    },
    [dispatch]
  );

  const getSelectedFontOption = useCallback((): ArabicFontOption => {
    const foundOption = ARABIC_FONT_OPTIONS.find(option => option.name === selectedFont);
    if (foundOption) {
      return foundOption;
    }
    // Fallback to first option if selected font is not found
    const defaultOption = ARABIC_FONT_OPTIONS[0];
    if (!defaultOption) {
      throw new Error('No Arabic font options available');
    }
    return defaultOption;
  }, [selectedFont]);

  return useMemo(
    () => ({
      selectedFont,
      selectedFontSize,
      fontOptions: ARABIC_FONT_OPTIONS,
      selectFont,
      setFontSize,
      getSelectedFontOption,
      fontSizeRange: FONT_SIZE_RANGE,
    }),
    [selectedFont, selectedFontSize, selectFont, setFontSize, getSelectedFontOption]
  );
};
