import { useSyncExternalStore } from 'react';
import { Image } from 'react-native';

import { Skia, type SkTypefaceFontProvider } from '@shopify/react-native-skia';

import amiriFont from '@/assets/fonts/Amiri.ttf';
import madinaFont from '@/assets/fonts/Madina.otf';
import nastaliqFont from '@/assets/fonts/Nastaliq.ttf';
import notoSansFont from '@/assets/fonts/NotoSans.ttf';
import scheherazadeFont from '@/assets/fonts/Scheherazade.ttf';
import { resolveArabicFont } from '@/constants/fonts';
import { clampArabicFontSize } from '@/constants/layout';
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

const FONT_SOURCES: Record<string, number> = {
  'Noto Sans Arabic': notoSansFont,
  Amiri: amiriFont,
  'Digital Khatt New Madina': madinaFont,
  'Scheherazade New': scheherazadeFont,
  'Noto Nastaliq Urdu': nastaliqFont,
};

/**
 * App-wide singleton TypefaceFontProvider.
 *
 * Skia's own useFonts() loads and parses every font file per component
 * instance — with one Skia word component per Arabic word that meant
 * hundreds of redundant ~4MB font loads per article. The typefaces are
 * loaded exactly once here and shared by every ParagraphBuilder.
 */
let sharedFontManager: SkTypefaceFontProvider | null = null;
let fontLoadPromise: Promise<void> | null = null;
const fontSubscribers = new Set<() => void>();

const loadSharedFontManager = (): Promise<void> => {
  if (!fontLoadPromise) {
    fontLoadPromise = Promise.all(
      Object.entries(FONT_SOURCES).map(async ([familyName, source]) => {
        const data = await Skia.Data.fromURI(Image.resolveAssetSource(source).uri);
        const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
        if (!typeface) {
          throw new Error(`Couldn't create typeface for ${familyName}`);
        }
        return [familyName, typeface] as const;
      }),
    )
      .then(entries => {
        const manager = Skia.TypefaceFontProvider.Make();
        for (const [familyName, typeface] of entries) {
          manager.registerFont(typeface, familyName);
        }
        sharedFontManager = manager;
        fontSubscribers.forEach(notify => notify());
      })
      .catch((error: unknown) => {
        // Allow a retry on the next subscriber if loading failed (e.g. dev server hiccup)
        fontLoadPromise = null;
        if (__DEV__) {
          console.warn('[useSkiaFonts] Failed to load Arabic fonts', error);
        }
      });
  }
  return fontLoadPromise;
};

const subscribeToFontManager = (callback: () => void) => {
  fontSubscribers.add(callback);
  void loadSharedFontManager();
  return () => {
    fontSubscribers.delete(callback);
  };
};

const getFontManagerSnapshot = () => sharedFontManager;

export interface UseSkiaFontsResult {
  /** Whether fonts are ready to use */
  isReady: boolean;
  /** Current font size from settings */
  fontSize: number;
  /** Current font family name for Skia rendering */
  fontFamily: string;
  /** Shared Skia font manager for ParagraphBuilder (null until loaded once per app session) */
  fontManager: SkTypefaceFontProvider | null;
}

/**
 * Hook to manage Skia fonts for Arabic text rendering
 * Provides the selected font family/size and the shared font manager
 * used by the Paragraph API. Font weight/style belong in the paragraph
 * text style (e.g. `fontStyle: { weight }`), not on an SkFont.
 */
export const useSkiaFonts = (): UseSkiaFontsResult => {
  const selectedFontName = useAppSelector(state => resolveArabicFont(state.settings.arabicFont));
  // Clamped rather than `|| LARGE`: the fallback only caught 0/undefined, so a
  // persisted size from outside the supported range — an older build's, or a
  // corrupted one — was painted at face value.
  const fontSize = useAppSelector(state => clampArabicFontSize(state.settings.arabicFontSize));

  const fontManager = useSyncExternalStore(subscribeToFontManager, getFontManagerSnapshot);

  const fontFamily = SKIA_FONT_FAMILY_MAP[selectedFontName] || 'Noto Sans Arabic';

  return {
    isReady: fontManager !== null,
    fontSize,
    fontFamily,
    fontManager,
  };
};
