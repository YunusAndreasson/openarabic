import { useCallback, useMemo } from 'react';

import { LAYOUT } from '@/constants/layout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setArabicFont, setArabicFontSize, type ArabicFontName } from '@/store/settingsSlice';
import { ArabicFont, FontDescription } from '@/types/enums';

export interface ArabicFontOption {
  name: ArabicFontName;
  displayName: string;
  description: string;
  previewText: string;
}

export const ARABIC_FONT_OPTIONS: ArabicFontOption[] = [
  {
    name: 'NotoSansArabic-Regular',
    displayName: ArabicFont.NOTO_SANS,
    description: FontDescription.NOTO_SANS,
    previewText: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
  },
  {
    name: 'DigitalKhattNewMadinaRegular',
    displayName: ArabicFont.MADINA,
    description: FontDescription.MADINA,
    previewText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  },
  {
    name: 'Amiri-Regular',
    displayName: ArabicFont.AMIRI,
    description: FontDescription.AMIRI,
    previewText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  },
  {
    name: 'ScheherazadeNew-Regular',
    displayName: ArabicFont.SCHEHERAZADE,
    description: FontDescription.SCHEHERAZADE,
    previewText: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ',
  },
  {
    name: 'NotoNastaliqUrdu-Regular',
    displayName: ArabicFont.NASTALIQ,
    description: FontDescription.NASTALIQ,
    previewText: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  },
];

// Font size range - following Miller's Law (5-9 options)
export const FONT_SIZE_RANGE = {
  MIN: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // 13px
  MAX: LAYOUT.TYPOGRAPHY.SCALE.MASSIVE, // 40px
  DEFAULT: LAYOUT.TYPOGRAPHY.SCALE.XLARGE, // 20px
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
