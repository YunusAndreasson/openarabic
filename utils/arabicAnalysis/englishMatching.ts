/**
 * English pattern matching functions for Arabic word analysis
 */

import { WHITESPACE_REGEX } from './constants';
import { expandContractions, normalizeArabic, normalizeEnglish } from './normalization';

/**
 * Determines if a pattern should be rejected because it matches the entire translation
 *
 * Rules:
 * 1. Single-word translations: always allow (e.g., 'و' → 'and')
 * 2. Multi-word translations with standalone particle: allow if component = entire Arabic word (e.g., 'لم' → 'does not')
 * 3. Multi-word translations with compound word: reject whole-translation matches (defeats educational purpose)
 *
 * @param candidate - The normalized candidate pattern
 * @param normalizedEnglish - The normalized English translation
 * @param tokenCount - Number of words in the English translation
 * @param arabicWord - The original Arabic word (optional)
 * @param componentPattern - The Arabic component pattern (optional)
 * @returns true if the pattern should be rejected
 */
function shouldRejectWholeTranslationMatch(
  candidate: string,
  normalizedEnglish: string,
  tokenCount: number,
  arabicWord?: string,
  componentPattern?: string,
): boolean {
  // Rule 1: Single-word translations always allowed
  if (tokenCount === 1) {
    return false;
  }

  // Only apply rejection for whole-translation matches in multi-word phrases
  if (candidate !== normalizedEnglish) {
    return false;
  }

  // Multi-word triggers (e.g., 'for what', 'from whom') are designed to match exactly
  // small contracted Arabic forms (مما, ممن). Allow them to consume the whole translation
  // even when the Arabic word is longer than the component, because the trigger phrase
  // *is* the meaning. Single-word triggers stay subject to the rejection (Rule 3).
  if (candidate.includes(' ')) {
    return false;
  }

  // Rule 2: Check if this is a standalone particle (component = entire Arabic word)
  if (arabicWord && componentPattern) {
    const normalizedArabicWord = normalizeArabic(arabicWord);
    const isStandaloneParticle = normalizedArabicWord.length === componentPattern.length;

    // Allow standalone particles (e.g., 'لم' where the prefix IS the word)
    // Reject compound words (e.g., 'والبيت' where 'و' is just a prefix)
    return !isStandaloneParticle;
  }

  // Rule 3: No Arabic context provided - reject whole-translation matches by default
  return true;
}

/**
 * Optimized function to check if English contains any patterns
 */
export function hasEnglishMatch(
  english: string,
  patterns: string[],
  arabicWord?: string,
  componentPattern?: string,
): string[] {
  // Expand contractions BEFORE normalization to preserve apostrophes for lookup
  const expandedEnglish = expandContractions(english);
  const norm = normalizeEnglish(expandedEnglish);
  const tokens = norm.split(WHITESPACE_REGEX).filter(Boolean);

  // Build unigram set for fast membership checks
  const unigrams = new Set(tokens);
  let bigrams: Set<string> | null = null;
  let trigrams: Set<string> | null = null;

  const matches: string[] = [];
  for (const raw of patterns) {
    // Normalize the pattern for matching
    const candidate = normalizeEnglish(raw);

    // Check if we should reject this whole-translation match
    if (
      shouldRejectWholeTranslationMatch(
        candidate,
        norm,
        tokens.length,
        arabicWord,
        componentPattern,
      )
    ) {
      continue;
    }

    if (candidate.includes(' ')) {
      // Lazily build bigrams/trigrams when needed
      if (bigrams === null || trigrams === null) {
        bigrams = new Set(
          tokens
            .map((_, i) => (i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : ''))
            .filter(Boolean),
        );
        trigrams = new Set(
          tokens
            .map((_, i) =>
              i + 2 < tokens.length ? `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}` : '',
            )
            .filter(Boolean),
        );
      }
      // Explicit null checks for TypeScript
      if (bigrams !== null && trigrams !== null) {
        if (bigrams.has(candidate) || trigrams.has(candidate)) {
          matches.push(raw);
        }
      }
    } else {
      if (unigrams.has(candidate)) {
        matches.push(raw);
      }
    }
  }

  return matches;
}
