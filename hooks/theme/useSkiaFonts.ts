import { useSyncExternalStore } from 'react';
import { Image } from 'react-native';

import { Skia, type SkTypefaceFontProvider } from 'react-native-skia';

import amiriFont from '@/assets/fonts/Amiri.ttf';
import madinaFont from '@/assets/fonts/Madina.otf';
import nastaliqFont from '@/assets/fonts/Nastaliq.ttf';
import notoSansFont from '@/assets/fonts/NotoSans.ttf';
import scheherazadeFont from '@/assets/fonts/Scheherazade.ttf';
import { resolveArabicFont, SKIA_FONT_FAMILY_MAP, type SkiaFontFamily } from '@/constants/fonts';
import { clampArabicFontSize } from '@/constants/layout';
import { useAppSelector } from '@/store/hooks';

/**
 * The .ttf/.otf behind each Skia family, keyed by the family name itself.
 *
 * `Record<SkiaFontFamily, number>` rather than `Record<string, number>`: these
 * keys have to be exactly the VALUES of `SKIA_FONT_FAMILY_MAP`, and as an open
 * string map they were two independent lists kept in step by eye. Rename a
 * family on one side only and the provider silently never registers that face,
 * so `paragraphBuilder` asks for a family nothing loaded and Skia quietly
 * substitutes a default — the learner's chosen Arabic typeface just stops
 * appearing, with no error anywhere.
 */
const FONT_SOURCES: Record<SkiaFontFamily, number> = {
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
        const asset = Image.resolveAssetSource(source);
        if (!asset) {
          throw new Error(`Couldn't resolve the font asset for ${familyName}`);
        }
        const data = await Skia.Data.fromURI(asset.uri);
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
  fontFamily: SkiaFontFamily;
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

  // No `|| 'Noto Sans Arabic'` fallback: `resolveArabicFont` has already
  // narrowed the persisted name to an ArabicFontName, and the map is total over
  // those, so the lookup cannot miss. The fallback could only fire for a key the
  // type system no longer admits.
  const fontFamily = SKIA_FONT_FAMILY_MAP[selectedFontName];

  return {
    isReady: fontManager !== null,
    fontSize,
    fontFamily,
    fontManager,
  };
};
