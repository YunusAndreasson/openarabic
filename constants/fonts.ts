/**
 * Font family constants for the OpenArabic app.
 *
 * Use platform system fonts for English text and Noto Sans Arabic
 * for Arabic script support with proper diacritics rendering.
 */

export const FONTS = {
  /** Platform system font (SF Pro on iOS, Roboto on Android) */
  ENGLISH: 'System',
  /** Default Arabic font with diacritics support */
  ARABIC: 'NotoSansArabic-Regular',
} as const;
