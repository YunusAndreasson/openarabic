/**
 * Font family constants for the OpenArabic app.
 *
 * Uses Inter for English text and Noto Sans Arabic
 * for Arabic script support with proper diacritics rendering.
 */

export const FONTS = {
  /** Inter - Regular weight for body text */
  ENGLISH: 'Inter-Regular',
  /** Inter - SemiBold weight for emphasis */
  ENGLISH_SEMIBOLD: 'Inter-SemiBold',
  /** Inter - Bold weight for headings */
  ENGLISH_BOLD: 'Inter-Bold',
  /** Default Arabic font with diacritics support */
  ARABIC: 'NotoSansArabic-Regular',
} as const;

/** Every Arabic face the app ships, by the name `useFonts` registers it under. */
export const ARABIC_FONT_NAMES = [
  'NotoSansArabic-Regular',
  'DigitalKhattNewMadinaRegular',
  'Amiri-Regular',
  'ScheherazadeNew-Regular',
  'NotoNastaliqUrdu-Regular',
] as const;

export type ArabicFontName = (typeof ARABIC_FONT_NAMES)[number];

/**
 * Narrows a persisted font choice to a face the app can actually render.
 *
 * `settings` is rehydrated from storage with no migration step, so a name a
 * later build no longer ships arrives here intact. Each reader used to cope
 * alone and they disagreed: Skia fell back to Noto Sans, `<Text>` handed the
 * unknown family to Android and got the system face, the account row printed
 * "Noto Sans", and the picker matched nothing at all — five typefaces offered
 * and none marked as the current one.
 */
export const resolveArabicFont = (name: unknown): ArabicFontName =>
  ARABIC_FONT_NAMES.includes(name as ArabicFontName) ? (name as ArabicFontName) : FONTS.ARABIC;
