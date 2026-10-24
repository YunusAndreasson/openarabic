/**
 * Validation helper functions for Arabic word analysis
 */

import { isOneOf } from '@/utils/list';

import { VALIDATION_CONFIG } from './constants';

/** Set of weak letters for O(1) lookup in countConsonants */
const WEAK_LETTER_SET = new Set<string>(VALIDATION_CONFIG.WEAK_LETTERS);

/**
 * Count consonants in Arabic text (excluding weak letters ا، و، ي)
 */
export function countConsonants(text: string): number {
  let count = 0;
  for (const char of text) {
    if (!WEAK_LETTER_SET.has(char)) {
      count++;
    }
  }
  return count;
}

/**
 * Check if text has substantial structure (minimum length and consonants)
 * Used to distinguish roots from affixes
 */
export function hasSubstantialStructure(
  text: string,
  minLength: number,
  minConsonants: number,
): boolean {
  return text.length >= minLength && countConsonants(text) >= minConsonants;
}

/**
 * Check if a pattern is a subject marker prefix (ي، ت، ن، أ)
 */
export function isSubjectMarker(pattern: string): boolean {
  return isOneOf(VALIDATION_CONFIG.SUBJECT_MARKERS, pattern);
}

/**
 * Check if a pattern is a future-tense (س، سوف) or negation (لا، لم، لن) prefix
 */
export function isFutureOrNegationPrefix(pattern: string): boolean {
  return (
    isOneOf(VALIDATION_CONFIG.FUTURE_TENSE_PREFIXES, pattern) ||
    isOneOf(VALIDATION_CONFIG.NEGATION_PREFIXES, pattern)
  );
}

/**
 * Check if a pattern is a high-risk suffix requiring validation
 */
export function isHighRiskSuffix(pattern: string): boolean {
  return isOneOf(VALIDATION_CONFIG.HIGH_RISK_SUFFIXES, pattern);
}

/**
 * Check if a pattern is a high-risk preposition requiring validation
 */
export function isHighRiskPreposition(pattern: string): boolean {
  return isOneOf(VALIDATION_CONFIG.HIGH_RISK_PREPOSITIONS, pattern);
}

/**
 * Check if pattern is a preposition form that changes before suffixes
 *
 * These are prepositions ending in ى (alef maksura) that change to ي before pronoun suffixes
 * - على → عليه (upon him) uses علي form
 * - على → عليّ (upon me) should use عل form
 */
export function isFormWithSuffixPattern(arabicMatch: string): boolean {
  return isOneOf(VALIDATION_CONFIG.PREPOSITIONS_WITH_SUFFIXES, arabicMatch);
}

/** Pre-computed shortened preposition forms (على/علي → عل, لدى/لدي → لد, إلى/إلي → إل) */
const SHORTENED_FORMS: Record<string, string> = {
  علي: 'عل',
  على: 'عل',
  لدي: 'لد',
  لدى: 'لد',
  إلي: 'إل',
  إلى: 'إل',
};

export function getShortenedPrepositionForm(fullForm: string): string | undefined {
  return SHORTENED_FORMS[fullForm];
}
