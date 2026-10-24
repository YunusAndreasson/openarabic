/**
 * Text normalization functions for Arabic word analysis
 */

import { CONTRACTION_MAP } from '@/constants/contractions';

import {
  ARABIC_NORMALIZATION_CACHE,
  ENGLISH_NORMALIZATION_CACHE,
  cacheWithFifoEviction,
} from './cache';
import { DIACRITIC_REGEX_GLOBAL, NON_WORD_REGEX, UNICODE_FORMAT_REGEX } from './constants';

/** إ (U+0625, hamza below), آ (U+0622, madda), ٱ (U+0671, wasla) — NOT أ (U+0623). */
const ALEF_VARIANTS_REGEX = /[إآٱ]/g;

/**
 * Folds the alef variants إ/آ/ٱ into plain ا (U+0627), for hamza-insensitive
 * comparison.
 *
 * NOT أ (alef with hamza above): it is preserved to distinguish the
 * first-person prefix أ from the prosthetic alef ا of Form VII-X verbs
 * (استطاع, انكسر, اجتمع). The one statement of that rule — `normalizeArabic`,
 * the affix matcher and the translation-rule keys all fold through here, so a
 * rule key can never be spelled differently from the text it is looked up by.
 */
export function foldAlefVariants(text: string): string {
  return text.replace(ALEF_VARIANTS_REGEX, 'ا');
}

/**
 * Normalizes Arabic text for comparison (with caching)
 *
 * Operations:
 * 1. Normalize alef variants (إ/آ/ٱ) to plain alef (ا) — NOT أ (preserves hamza above)
 * 2. Remove Unicode formatting characters (RTL marks, zero-width chars)
 * 3. Remove diacritics (harakat: fatha, kasra, damma, sukun, shadda, etc.)
 * 4. Trim whitespace
 *
 * Note: أ (alef with hamza above) is intentionally NOT normalized to avoid false
 * positives. The أ prefix (first-person marker) must remain distinct from ا
 * (prosthetic alef in Form VII-X verbs like استطاع, انكسر).
 *
 * @param text - Original Arabic text with diacritics
 * @returns Normalized Arabic text without diacritics or formatting characters
 * @example normalizeArabic("ٱلْكِتَابُ") → "الكتاب"
 * @example normalizeArabic("إِلَيْهِ") → "اليه"
 */
export function normalizeArabic(text: string): string {
  const cached = ARABIC_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // Fold the alef variants, remove Unicode formatting characters (RTL marks,
  // zero-width characters, etc.), then remove diacritics, then trim
  const normalized = foldAlefVariants(text)
    .replace(UNICODE_FORMAT_REGEX, '')
    .replace(DIACRITIC_REGEX_GLOBAL, '')
    .trim();

  cacheWithFifoEviction(ARABIC_NORMALIZATION_CACHE, text, normalized);

  return normalized;
}

/**
 * Alternative-gloss separator. A slash joins two readings of the same word
 * ("so she/it made known", "he/it", "on / upon"); stripping it as ordinary
 * punctuation welds them into one unmatchable token ("sheit"), so neither
 * reading can ever satisfy a component trigger. Replaced with a space instead.
 *
 * Deliberately NOT extended to hyphens: those overwhelmingly join proper nouns
 * ("Al-Fatiha") and compound adjectives ("well-known", "self-sufficient") in this
 * corpus, where splitting would manufacture spurious trigger tokens.
 */
const ALTERNATIVE_SEPARATOR_REGEX = /\//g;

/**
 * Normalizes English text for comparison (with caching)
 */
export function normalizeEnglish(text: string): string {
  const cached = ENGLISH_NORMALIZATION_CACHE.get(text);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = text
    .toLowerCase()
    .replace(ALTERNATIVE_SEPARATOR_REGEX, ' ')
    .replace(NON_WORD_REGEX, '')
    .trim();

  cacheWithFifoEviction(ENGLISH_NORMALIZATION_CACHE, text, normalized);

  return normalized;
}

// Pre-compiled contraction regexes (avoids creating 39 RegExp objects per call)
const CONTRACTION_REGEXES = Object.entries(CONTRACTION_MAP).map(([contraction, expansion]) => ({
  regex: new RegExp(`\\b${contraction}\\b`, 'g'),
  expansion,
}));

/**
 * Expands contractions in English text BEFORE normalization
 * This preserves apostrophes for contraction lookup before they're removed
 *
 * @param text - English text that may contain contractions
 * @returns Text with contractions expanded (e.g., "don't know" → "do not know")
 */
export function expandContractions(text: string): string {
  const lower = text.toLowerCase();

  // Fast path: no apostrophe means no contractions possible
  // Skips 39 regex replacements for ~95% of Arabic translations
  if (!lower.includes("'")) {
    return lower;
  }

  let expanded = lower;
  for (const { regex, expansion } of CONTRACTION_REGEXES) {
    regex.lastIndex = 0;
    expanded = expanded.replace(regex, expansion);
  }

  return expanded;
}
