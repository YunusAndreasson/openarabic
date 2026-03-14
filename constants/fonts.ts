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
