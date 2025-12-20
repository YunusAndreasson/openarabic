/**
 * Translation Normalization Utility
 *
 * Provides functions to normalize English translations of Arabic words
 * before component analysis. Converts transliterations (e.g., "wa la")
 * to meaningful translations (e.g., "and not").
 */

import { NORMALIZATION_MAP } from '@/constants/translationNormalizations';
import { normalizeArabic } from './normalization';

/**
 * Normalizes English translations of Arabic words
 *
 * For specific Arabic words, always returns the consistent English translation
 * regardless of what the database contains.
 *
 * @param arabicWord - The Arabic word (with or without diacritics)
 * @param englishTranslation - The English translation from database (ignored if rule exists)
 * @returns Normalized English translation if a rule exists, otherwise the original
 *
 * @example
 * ```typescript
 * // Arabic word has a rule - always return normalized English
 * normalizeTranslation('فقد', 'and so') // Returns: 'so indeed'
 * normalizeTranslation('فقد', 'then') // Returns: 'so indeed'
 * normalizeTranslation('فقد', 'so indeed') // Returns: 'so indeed'
 *
 * // No rule exists - return original
 * normalizeTranslation('كتاب', 'book') // Returns: 'book'
 * ```
 */
export function normalizeTranslation(arabicWord: string, englishTranslation: string): string {
  // Normalize Arabic for rule lookup (removes diacritics, standardizes)
  const normalizedArabic = normalizeArabic(arabicWord);

  // Check if we have a normalization rule for this Arabic word
  const normalizedEnglish = NORMALIZATION_MAP.get(normalizedArabic);

  // If we have a rule, ALWAYS return the normalized English
  // Otherwise, return the original translation
  return normalizedEnglish || englishTranslation;
}
