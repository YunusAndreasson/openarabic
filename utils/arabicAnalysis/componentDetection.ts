/**
 * Core component detection functions for Arabic word analysis
 */

import {
  ARABIC_DIACRITICS,
  ARABIC_INFIXES,
  ComponentType,
  GrammaticalRole,
  type WordComponent,
} from '@/constants/arabicWordComponents';

import { VALIDATION_CONFIG } from './constants';
import { hasEnglishMatch } from './englishMatching';
import type { AnalyzedComponent } from './types';
import {
  countConsonants,
  hasSubstantialStructure,
  isHighRiskPreposition,
  isHighRiskSuffix,
  isSubjectMarker,
} from './validation';

/** Normalize alef variants (إ/آ/ٱ → ا) for hamza-insensitive pattern comparison.
 * NOT أ — single-char prefix أ must stay distinct from prosthetic alef ا. */
const ALEF_VARIANTS_REGEX = /[إآٱ]/g;
const normalizeAlef = (s: string): string => s.replace(ALEF_VARIANTS_REGEX, 'ا');

/**
 * Unified function to find components (prefix, infix, suffix, or diacritic)
 */
export function findComponent(
  arabic: string,
  english: string,
  components: WordComponent[],
  type: ComponentType,
): AnalyzedComponent | undefined {
  let best: AnalyzedComponent | undefined;

  for (const component of components) {
    const pattern = component.arabic;

    // Check if pattern matches based on type
    let matches = false;
    if (type === ComponentType.PREFIX) {
      // Hamza-insensitive: normalize pattern alef variants to match normalizeArabic() output
      // Input arabic is already normalized (أ/إ/آ/ٱ → ا), so normalize pattern to match
      matches = arabic.startsWith(normalizeAlef(pattern));
    } else if (type === ComponentType.SUFFIX) {
      matches = arabic.endsWith(pattern);
    } else if (type === ComponentType.INFIX) {
      // For infixes, check if pattern exists within the word (not at start/end)
      const index = arabic.indexOf(pattern);
      matches = index > 0 && index < arabic.length - pattern.length;
      // Additional precision for Form X seeking/requesting infix "ست": require preceding 'ا'
      if (matches && pattern === 'ست') {
        const preceding = index > 0 ? arabic[index - 1] : '';
        if (preceding !== 'ا') {
          matches = false;
        }
      }
    } else if (type === ComponentType.DIACRITIC) {
      // For diacritics, work with original text (not normalized) and check for pattern at end
      matches = arabic.trim().endsWith(pattern);
    }

    // PREFIX validation: subject markers and high-risk prepositions
    if (matches && type === ComponentType.PREFIX) {
      if (isSubjectMarker(pattern)) {
        const remaining = arabic.slice(pattern.length);
        if (
          !hasSubstantialStructure(
            remaining,
            VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_REMAINING_LENGTH,
            VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_CONSONANTS,
          )
        ) {
          matches = false;
        }
      }

      if (isHighRiskPreposition(pattern)) {
        const remaining = arabic.slice(pattern.length);
        const knownParticles = ['ما', 'من', 'ن'];
        const isParticleCombination = knownParticles.includes(remaining);

        if (!isParticleCombination) {
          if (
            !hasSubstantialStructure(
              remaining,
              VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_REMAINING_LENGTH,
              VALIDATION_CONFIG.PREFIX_VALIDATION.MIN_CONSONANTS,
            )
          ) {
            matches = false;
          }
        }
      }
    }

    // SUFFIX validation: high-risk suffixes
    if (matches && type === ComponentType.SUFFIX) {
      if (isHighRiskSuffix(pattern)) {
        const remaining = arabic.slice(0, arabic.length - pattern.length);
        const isLikelyPrefixOnly = remaining.length <= 1;

        if (!isLikelyPrefixOnly) {
          const startsWithSubjectMarker = isSubjectMarker(remaining.charAt(0));
          const possessivePronouns = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
          const englishWords = english.toLowerCase().split(/\s+/);
          const hasPossessivePronoun = englishWords.some(word => possessivePronouns.includes(word));

          const hasHiddenPrefix =
            startsWithSubjectMarker && remaining.length <= 3 && !hasPossessivePronoun;

          const minLengthRequired = hasHiddenPrefix
            ? VALIDATION_CONFIG.SUFFIX_VALIDATION.HIDDEN_PREFIX_MIN_LENGTH
            : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_REMAINING_LENGTH;

          const minLengthSatisfied = remaining.length >= minLengthRequired;

          const minConsonantsRequired =
            remaining.length === 2
              ? VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_2CHAR
              : hasPossessivePronoun
                ? VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_2CHAR
                : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_3PLUS;
          const hasEnoughConsonants = countConsonants(remaining) >= minConsonantsRequired;

          const potentialFa3eelPattern =
            pattern === 'ه' && remaining.length === 3 && remaining.charAt(2) === 'ي';

          const isKnownPreposition = (
            VALIDATION_CONFIG.PREPOSITIONS_WITH_SUFFIXES as readonly string[]
          ).includes(remaining);

          const isFa3eelPattern = potentialFa3eelPattern && !isKnownPreposition;

          if (!minLengthSatisfied || !hasEnoughConsonants || isFa3eelPattern) {
            matches = false;
          }
        }
      }
    }

    if (matches) {
      const englishMatches = hasEnglishMatch(english, component.english, arabic, pattern);
      if (englishMatches.length > 0 && (!best || pattern.length > best.arabicMatch.length)) {
        best = {
          component,
          arabicMatch: pattern,
          englishMatches,
          matchedInEnglish: true,
          role: component.role,
        };
      }
    }
  }

  return best;
}

/**
 * Overlap resolution for prefix and suffix - keeps the longer component
 */
export function resolveOverlap(
  normalized: string,
  prefix: AnalyzedComponent | undefined,
  suffix: AnalyzedComponent | undefined,
): {
  resolvedPrefix: AnalyzedComponent | undefined;
  resolvedSuffix: AnalyzedComponent | undefined;
} {
  if (!prefix || !suffix) {
    return { resolvedPrefix: prefix, resolvedSuffix: suffix };
  }

  const prefixEnd = prefix.arabicMatch.length;
  const suffixStart = normalized.length - suffix.arabicMatch.length;

  if (prefixEnd > suffixStart) {
    return prefix.arabicMatch.length >= suffix.arabicMatch.length
      ? { resolvedPrefix: prefix, resolvedSuffix: undefined }
      : { resolvedPrefix: undefined, resolvedSuffix: suffix };
  }

  return { resolvedPrefix: prefix, resolvedSuffix: suffix };
}

/**
 * Finds infix components in the remaining text after prefix/suffix removal
 */
export function findInfix(
  remainingArabic: string,
  english: string,
  prefixes: AnalyzedComponent[],
  suffix?: AnalyzedComponent,
): AnalyzedComponent | undefined {
  const result = findComponent(remainingArabic, english, ARABIC_INFIXES, ComponentType.INFIX);

  if (result) {
    const claimedWords = new Set<string>();

    prefixes.forEach(prefix => {
      prefix.englishMatches.forEach(match => {
        match
          .toLowerCase()
          .split(/\s+/)
          .forEach(word => claimedWords.add(word));
      });
    });

    if (suffix) {
      suffix.englishMatches.forEach(match => {
        match
          .toLowerCase()
          .split(/\s+/)
          .forEach(word => claimedWords.add(word));
      });
    }

    const allClaimed = result.englishMatches.every(match =>
      match
        .toLowerCase()
        .split(/\s+/)
        .every(word => claimedWords.has(word)),
    );

    if (allClaimed) {
      return undefined;
    }
  }

  return result;
}

/**
 * Finds diacritic components in the original text (before normalization)
 */
export function findDiacritic(arabic: string, english: string): AnalyzedComponent | undefined {
  return findComponent(arabic, english, ARABIC_DIACRITICS, ComponentType.DIACRITIC);
}

/**
 * Determines if bracket injection ([the]) should be applied for definite article
 */
export function shouldInjectBracket(normalizedArabic: string, englishTranslation: string): boolean {
  const hasDefiniteArticle =
    normalizedArabic.startsWith('ال') ||
    normalizedArabic.startsWith('بال') ||
    normalizedArabic.startsWith('لل') ||
    normalizedArabic.startsWith('كال');

  if (!hasDefiniteArticle) {
    return false;
  }

  const lowerEnglish = englishTranslation.toLowerCase();
  const theWordRegex = /\bthe\b/;
  if (theWordRegex.test(lowerEnglish)) {
    return false;
  }

  const skipInjection =
    normalizedArabic.includes('الله') ||
    lowerEnglish.includes('god') ||
    lowerEnglish.includes('allah') ||
    lowerEnglish.includes('lord') ||
    lowerEnglish.includes('creator') ||
    lowerEnglish.includes('most high');

  return !skipInjection;
}

/**
 * Analyze diacritic matches against other components
 */
export function analyzeDiacriticMatches(
  diacriticMatches: string[],
  otherComponents: (AnalyzedComponent | undefined)[],
): {
  hasUnique: boolean;
  overlappingComponent: AnalyzedComponent | undefined;
  overlappingMatches: string[];
} {
  if (diacriticMatches.length === 0) {
    return { hasUnique: false, overlappingComponent: undefined, overlappingMatches: [] };
  }

  const normalizedDiacriticMatches = diacriticMatches.map(m => m.toLowerCase());
  let overlappingComponent: AnalyzedComponent | undefined;
  const overlappingMatches: string[] = [];

  for (const component of otherComponents) {
    if (!component?.englishMatches) continue;

    const componentMatchesLower = component.englishMatches.map(m => m.toLowerCase());
    const overlap = normalizedDiacriticMatches.filter(diacriticMatch => {
      return componentMatchesLower.some(componentMatch => {
        if (componentMatch === diacriticMatch) return true;
        const escapedMatch = diacriticMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedMatch}\\b`, 'i');
        return wordBoundaryRegex.test(componentMatch);
      });
    });

    if (overlap.length > 0) {
      overlappingMatches.push(...overlap);
      if (!overlappingComponent) {
        overlappingComponent = component;
      }
    }
  }

  const hasUnique = normalizedDiacriticMatches.some(m => !overlappingMatches.includes(m));

  return { hasUnique, overlappingComponent, overlappingMatches };
}

/**
 * Detect if a diacritic is grammatically related to another component
 */
export function areGrammaticallyRelated(
  diacritic: AnalyzedComponent,
  overlappingComponent: AnalyzedComponent,
  overlappingMatches: string[],
): boolean {
  const diacriticArabic = diacritic.arabicMatch;
  const componentType = overlappingComponent.component.type;
  const normalizedOverlap = overlappingMatches.map(m => m.toLowerCase());

  // Relationship 1: Pronoun Suffix + Case Agreement
  if (componentType === ComponentType.SUFFIX) {
    const isPronounSuffix = overlappingComponent.role === GrammaticalRole.POSSESSIVE;
    if (isPronounSuffix) {
      return true;
    }

    const pronounPatterns = ['he', 'it', 'they', 'his', 'her', 'their', 'him', 'them'];
    const hasOverlappingPronoun = normalizedOverlap.some(m => pronounPatterns.includes(m));
    if (hasOverlappingPronoun) {
      return true;
    }
  }

  // Relationship 2: Subject Prefix + Nominative Case
  if (componentType === ComponentType.PREFIX && diacriticArabic === 'ُ') {
    const subjectPatterns = ['he', 'she', 'it', 'they', 'you'];
    const hasOverlappingSubject = normalizedOverlap.some(m => subjectPatterns.includes(m));
    if (hasOverlappingSubject) {
      return true;
    }
  }

  // Relationship 3: Preposition + Genitive Case
  if (componentType === ComponentType.PREFIX && diacriticArabic === 'ِ') {
    const prepositionPatterns = ['from', 'in', 'with', 'to', 'by', 'for', 'of'];
    const hasOverlappingPreposition = normalizedOverlap.some(m => prepositionPatterns.includes(m));
    if (hasOverlappingPreposition) {
      return true;
    }
  }

  return false;
}
