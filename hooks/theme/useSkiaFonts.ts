import { useMemo } from 'react';

import { matchFont, type SkFont } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useAppSelector } from '@/store/hooks';
import type { ArabicFontName } from '@/store/settingsSlice';

/**
 * Font mapping for Skia rendering
 * Maps our internal font names to Skia-compatible font families
 */
const SKIA_FONT_FAMILY_MAP: Record<ArabicFontName, string> = {
  'NotoSansArabic-Regular': 'Noto Sans Arabic',
  DigitalKhattNewMadinaRegular: 'Digital Khatt New Madina',
  'Amiri-Regular': 'Amiri',
  'ScheherazadeNew-Regular': 'Scheherazade New',
  'NotoNastaliqUrdu-Regular': 'Noto Nastaliq Urdu',
};

/**
 * Weight mapping for font styles
 * Converts our TextWeight types to numeric font weights
 */
const FONT_WEIGHT_MAP = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export interface UseSkiaFontsResult {
  /** The currently selected Arabic font for Skia rendering */
  arabicFont: SkFont | null;
  /** Get a font with specific size and weight */
  getArabicFont: (size?: number, weight?: keyof typeof FONT_WEIGHT_MAP) => SkFont | null;
  /** Whether fonts are ready to use */
  isReady: boolean;
  /** Current font size from settings */
  fontSize: number;
  /** Current font family name for Skia rendering */
  fontFamily: string;
}

/**
 * Hook to manage Skia fonts for Arabic text rendering
 * Provides the currently selected Arabic font with proper configuration
 *
 * @example
 * const { arabicFont, getArabicFont, isReady } = useSkiaFonts();
 *
 * if (!isReady || !arabicFont) {
 *   return <LoadingSpinner />;
 * }
 *
 * return (
 *   <Canvas>
 *     <Text font={arabicFont} x={0} y={20} text="E1-('" />
 *   </Canvas>
 * );
 */
export const useSkiaFonts = (): UseSkiaFontsResult => {
  const selectedFontName = useAppSelector(state => state.settings.arabicFont);
  const fontSize = useAppSelector(state => state.settings.arabicFontSize);

  // Get the Skia-compatible font family name
  const fontFamily = SKIA_FONT_FAMILY_MAP[selectedFontName] || 'Noto Sans Arabic';

  // Create the default Arabic font with current settings
  const arabicFont = useMemo(() => {
    try {
      return matchFont({
        fontFamily,
        fontSize: fontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        fontStyle: 'normal',
        fontWeight: '400',
      });
    } catch {
      // Fallback to system font
      try {
        return matchFont({
          fontFamily: 'System',
          fontSize: fontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE,
          fontStyle: 'normal',
          fontWeight: '400',
        });
      } catch {
        return null;
      }
    }
  }, [fontFamily, fontSize]);

  // Function to get font with custom size and weight
  const getArabicFont = useMemo(
    () =>
      (size?: number, weight: keyof typeof FONT_WEIGHT_MAP = 'normal') => {
        try {
          return matchFont({
            fontFamily,
            fontSize: size || fontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE,
            fontStyle: 'normal',
            fontWeight: String(FONT_WEIGHT_MAP[weight]) as '400' | '500' | '600' | '700',
          });
        } catch {
          return null;
        }
      },
    [fontFamily, fontSize],
  );

  return {
    arabicFont,
    getArabicFont,
    isReady: arabicFont !== null,
    fontSize: fontSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontFamily,
  };
};
