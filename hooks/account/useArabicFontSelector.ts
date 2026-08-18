import { useCallback } from 'react';

import { ARABIC_FONT_NAMES, resolveArabicFont } from '@/constants/fonts';
import { ARABIC_FONT_SIZE, clampArabicFontSize } from '@/constants/layout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setArabicFont, setArabicFontSize, type ArabicFontName } from '@/store/settingsSlice';

export interface ArabicFontOption {
  name: ArabicFontName;
  displayName: string;
  description: string;
  previewText: string;
}

/**
 * The picker's cards, keyed by the face each one selects.
 *
 * Two things this shape buys that the previous flat array did not:
 *
 * 1. A font's three strings live on ONE row. The display name and the one-word
 *    description used to sit in two separate keyed objects in `types/enums.ts`
 *    (`ArabicFont` and `FontDescription`), so each face was spread across three
 *    objects and stayed aligned only by all three agreeing on a SCREAMING_CASE
 *    key that appears nowhere in the data.
 * 2. `satisfies Record<ArabicFontName, …>` makes the picker TOTAL over the
 *    faces the app ships. Add a face to `ARABIC_FONT_NAMES` without a card and
 *    the build fails, instead of shipping a font no one can choose; name a card
 *    after a face that was dropped and it fails too, instead of offering a card
 *    that selects nothing. Both are the failure `resolveArabicFont` exists to
 *    clean up after.
 */
const ARABIC_FONT_CARDS = {
  'NotoSansArabic-Regular': {
    displayName: 'Noto Sans',
    description: 'Simple',
    previewText: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
  },
  DigitalKhattNewMadinaRegular: {
    displayName: 'Madina',
    description: 'Modern & clean',
    previewText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  },
  'Amiri-Regular': {
    displayName: 'Amiri',
    description: 'Traditional',
    previewText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  },
  'ScheherazadeNew-Regular': {
    displayName: 'Scheherazade',
    description: 'Flowing',
    previewText: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ',
  },
  'NotoNastaliqUrdu-Regular': {
    displayName: 'Nastaliq',
    description: 'Calligraphic',
    previewText: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  },
} as const satisfies Record<ArabicFontName, Omit<ArabicFontOption, 'name'>>;

/**
 * Card order follows `ARABIC_FONT_NAMES` — the app's own list, so the default
 * face leads — rather than this module's object-literal order.
 */
const ARABIC_FONT_OPTIONS: readonly ArabicFontOption[] = ARABIC_FONT_NAMES.map(name => ({
  name,
  ...ARABIC_FONT_CARDS[name],
}));

export interface UseArabicFontSelectorResult {
  selectedFont: ArabicFontName;
  selectedFontSize: number;
  fontOptions: readonly ArabicFontOption[];
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
