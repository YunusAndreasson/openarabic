import { useCallback } from 'react';

import { resolveArabicFont } from '@/constants/fonts';
import { ARABIC_FONT_SIZE, clampArabicFontSize } from '@/constants/layout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setArabicFont, setArabicFontSize, type ArabicFontName } from '@/store/settingsSlice';
import { ArabicFont, FontDescription } from '@/types/enums';

export interface ArabicFontOption {
  name: ArabicFontName;
  displayName: string;
  description: string;
  previewText: string;
}

const ARABIC_FONT_OPTIONS: ArabicFontOption[] = [
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

export interface UseArabicFontSelectorResult {
  selectedFont: ArabicFontName;
  selectedFontSize: number;
  fontOptions: ArabicFontOption[];
  selectFont: (fontName: ArabicFontName) => void;
  setFontSize: (size: number) => void;
  fontSizeRange: typeof ARABIC_FONT_SIZE;
}

export const useArabicFontSelector = (): UseArabicFontSelectorResult => {
  const dispatch = useAppDispatch();
  // Resolved so the picker marks the face that is actually rendering. An
  // unfamiliar persisted name left all five cards unselected while the account
  // row above claimed "Noto Sans".
  const selectedFont = useAppSelector(state => resolveArabicFont(state.settings.arabicFont));
  // Clamped, not raw: the slider cannot represent a value outside its own range,
  // so a persisted out-of-range size would leave the thumb pinned at one end
  // while the readout claimed something else — and dragging from there would
  // read as the control lying about what it is set to.
  const selectedFontSize = useAppSelector(state =>
    clampArabicFontSize(state.settings.arabicFontSize),
  );

  const selectFont = useCallback(
    (fontName: ArabicFontName) => {
      dispatch(setArabicFont(fontName));
    },
    [dispatch],
  );

  const setFontSize = useCallback(
    (size: number) => {
      dispatch(setArabicFontSize(size));
    },
    [dispatch],
  );

  return {
    selectedFont,
    selectedFontSize,
    fontOptions: ARABIC_FONT_OPTIONS,
    selectFont,
    setFontSize,
    fontSizeRange: ARABIC_FONT_SIZE,
  };
};
