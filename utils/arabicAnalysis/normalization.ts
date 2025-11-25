/**
 * Text normalization functions for Arabic word analysis
 */

import { CONTRACTION_MAP } from '@/constants/contractions';

import {
  ARABIC_NORMALIZATION_CACHE,
  ENGLISH_NORMALIZATION_CACHE,
  cacheWithLRUEviction,
} from './cache';
import {
  DIACRITIC_REGEX_GLOBAL,
  NON_WORD_REGEX,
  UNICODE_FORMAT_REGEX,
} from './constants';

/**
 * Normalizes Arabic text for comparison (with caching)
 *
 * Operations:
 * 1. Normalize alef wasla (ٱ) to regular alef (ا)
 * 2. Remove Unicode formatting characters (RTL marks, zero-width chars)
 * 3. Remove diacritics (harakat: fatha, kasra, damma, sukun, shadda, etc.)
 * 4. Trim whitespace
 *
 * @param text - Original Arabic text with diacritics
 * @returns Normalized Arabic text without diacritics or formatting characters
 * @example normalizeArabic("ٱلْكِتَابُ") → "الكتاب"
 */
export function normalizeArabic(text: string): string {
  const cached = ARABIC_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // Normalize alef wasla (ٱ U+0671) to regular alef (ا U+0627)
  // Alef wasla is an orthographic variant used for the definite article
  // and should be treated as regular alef for analysis purposes
  let normalized = text.replace(/ٱ/g, 'ا');

  // Remove Unicode formatting characters (RTL marks, zero-width characters, etc.)
  // then remove diacritics, then trim
  normalized = normalized
    .replace(UNICODE_FORMAT_REGEX, '')
    .replace(DIACRITIC_REGEX_GLOBAL, '')
    .trim();

  cacheWithLRUEviction(ARABIC_NORMALIZATION_CACHE, text, normalized);

  return normalized;
}

/**
 * Normalizes English text for comparison (with caching)
 */
export function normalizeEnglish(text: string): string {
  const cached = ENGLISH_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = text.toLowerCase().replace(NON_WORD_REGEX, '').trim();

  cacheWithLRUEviction(ENGLISH_NORMALIZATION_CACHE, text, normalized);

  return normalized;
}

/**
 * Expands contractions in English text BEFORE normalization
 * This preserves apostrophes for contraction lookup before they're removed
 *
 * @param text - English text that may contain contractions
 * @returns Text with contractions expanded (e.g., "don't know" → "do not know")
 */
export function expandContractions(text: string): string {
  let expanded = text.toLowerCase();

  // Replace each contraction with its expanded form
  for (const [contraction, expansion] of Object.entries(CONTRACTION_MAP)) {
    // Use word boundary regex to avoid partial matches
    const regex = new RegExp(`\\b${contraction}\\b`, 'g');
    expanded = expanded.replace(regex, expansion);
  }

  return expanded;
}
