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

/** Pre-compiled regex for "the" word boundary check in bracket injection */
const THE_WORD_REGEX = /\bthe\b/;
const normalizeAlef = (s: string): string => s.replace(ALEF_VARIANTS_REGEX, 'ا');

/**
 * Productive plural-marker suffixes — morphologically present in Arabic regardless
 * of whether English uses an exact word equivalent. English typically marks plural
 * with -s, not a separate word, so strict English-trigger matching misses real
 * plural suffixes like الْمُسْلِمُونَ "the Muslims" or الظُّلُمَاتِ "the darknesses".
 *
 * The bypass below accepts these suffixes without an English trigger but only when:
 *   - English is multi-word (single-word translations stay uncolored anyway)
 *   - Remaining stem is ≥4 chars OR starts with ال (filters out short words like
 *     يَكُونُ "will be" where ون is a modal verb ending, not a plural marker).
 */
const PRODUCTIVE_PLURAL_SUFFIXES = new Set(['ون', 'ين', 'ات', 'وا']);
const PRODUCTIVE_PLURAL_MIN_STEM_LENGTH = 4;
const PRODUCTIVE_PLURAL_DEFINITE_PREFIX = 'ال';

/**
 * Pronoun suffixes eligible for the prefix+suffix-compound bypass — fires when
 * the entire remaining arabic IS the suffix (preposition + pronoun compound
 * like بِهِ "as such", لَهُ "for it"). The standalone-pronoun rejection in
 * arabicWordAnalysis.ts catches the no-prefix case. Only fires after the full
 * component iteration to avoid short-circuiting better English-trigger matches.
 */
const PRONOUN_COMPOUND_SUFFIXES = new Set([
  'ه', 'ها', 'هم', 'هما', 'هن', 'ك', 'كم', 'كما', 'كن', 'نا', 'ي',
]);
const PRONOUN_TOKENS_BLOCKING_BYPASS = new Set([
  'i', 'me', 'my', 'mine',
  'you', 'your', 'yours',
  'he', 'him', 'his',
  'she', 'her', 'hers',
  'it', 'its',
  'we', 'us', 'our', 'ours',
  'they', 'them', 'their', 'theirs',
]);

/**
 * Words where ال is morphologically fused into the stem (proper nouns, relative
 * pronouns, vocative compounds) and must not be detected as a separable definite
 * article. Used by the ال-bypass below.
 */
const FUSED_AL_WORDS = new Set([
  'الله', // Allah / God — proper noun
  'اللهم', // O Allah — fused vocative
  'الذي', // who / which — relative pronoun
  'الذين', // those who — plural relative pronoun
  'التي', // who / which (feminine) — relative pronoun
  'اللاتي', // those (feminine plural) — relative pronoun
  'اللواتي', // those (feminine plural) — relative pronoun
  'اللذان', // those two (masculine dual) — relative pronoun
  'اللتان', // those two (feminine dual) — relative pronoun
  // Hamza-on-alef forms that look like ال after normalization (إ/آ/ٱ → ا).
  // The matcher receives already-normalized input and cannot tell these apart
  // from genuine ال-prefixed words, so we list them explicitly.
  'الى', // ← إلى, preposition "to"
  'اليه', // ← إليه, "to him"
  'اليها', // ← إليها, "to her/it"
  'اليهم', // ← إليهم, "to them"
  'الا', // ← إلا, "except"
  'اله', // ← إله, "god"
  'الها', // ← إلها, "god" (acc)
  'الهي', // ← إلهي, "my god"
]);
const DEFINITE_ARTICLE_MIN_WORD_LENGTH = 4;

const ENGLISH_TOKEN_REGEX = /\s+/;
const isMultiWordEnglish = (english: string): boolean =>
  english.trim().split(ENGLISH_TOKEN_REGEX).filter(Boolean).length >= 2;

/**
 * Unified function to find components (prefix, infix, suffix, or diacritic)
 */
export function findComponent(
  arabic: string,
  english: string,
  components: WordComponent[],
  type: ComponentType,
): AnalyzedComponent | undefined {
  let pronounCompoundCandidate: AnalyzedComponent | undefined;
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
        // When remaining is 0, the word is entirely prefix+suffix (أنّه, فيه, بها, لها).
        // Allow these — the English match check later still gates correctness.
        // Only block when remaining is exactly 1 char (ambiguous single letter).
        const isPrefixSuffixCompound = remaining.length === 0;
        const isLikelyPrefixOnly = remaining.length === 1;

        if (!isLikelyPrefixOnly && !isPrefixSuffixCompound) {
          const startsWithSubjectMarker = isSubjectMarker(remaining.charAt(0));
          const possessivePronouns = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
          // Object/oblique pronouns indicating same referent as a possessive suffix.
          // Used to relax the fa3eel guard so words like إِلَيْهِ "toward him" /
          // عَلَيْهِ "against him" — where ـيه genuinely is stem+suffix — match.
          const objectPronouns = ['me', 'him', 'her', 'them', 'us'];
          const englishWords = english.toLowerCase().split(/\s+/);
          const hasPossessivePronoun = englishWords.some(word => possessivePronouns.includes(word));
          const hasObjectPronoun = englishWords.some(word => objectPronouns.includes(word));

          const hasHiddenPrefix =
            startsWithSubjectMarker && remaining.length <= 3 && !hasPossessivePronoun;

          const minLengthRequired = hasHiddenPrefix
            ? VALIDATION_CONFIG.SUFFIX_VALIDATION.HIDDEN_PREFIX_MIN_LENGTH
            : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_REMAINING_LENGTH;

          const minLengthSatisfied = remaining.length >= minLengthRequired;

          const minConsonantsRequired =
            remaining.length === 2
              ? VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_2CHAR
              : hasPossessivePronoun || hasObjectPronoun
                ? VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_2CHAR
                : VALIDATION_CONFIG.SUFFIX_VALIDATION.MIN_CONSONANTS_3PLUS;
          const hasEnoughConsonants = countConsonants(remaining) >= minConsonantsRequired;

          const potentialFa3eelPattern =
            pattern === 'ه' && remaining.length === 3 && remaining.charAt(2) === 'ي';

          const isKnownPreposition = (
            VALIDATION_CONFIG.PREPOSITIONS_WITH_SUFFIXES as readonly string[]
          ).includes(remaining);

          const isFa3eelPattern =
            potentialFa3eelPattern &&
            !isKnownPreposition &&
            !hasPossessivePronoun &&
            !hasObjectPronoun;

          if (!minLengthSatisfied || !hasEnoughConsonants || isFa3eelPattern) {
            matches = false;
          }
        }
      }
    }

    if (matches) {
      const englishMatches = hasEnglishMatch(english, component.english, arabic, pattern);
      if (englishMatches.length > 0) {
        // Component arrays are sorted longest-first, so the first match is the longest.
        return {
          component,
          arabicMatch: pattern,
          englishMatches,
          matchedInEnglish: true,
          role: component.role,
        };
      }
      // Productive-plural-marker bypass (see PRODUCTIVE_PLURAL_SUFFIXES docblock above)
      if (
        type === ComponentType.SUFFIX &&
        PRODUCTIVE_PLURAL_SUFFIXES.has(pattern) &&
        isMultiWordEnglish(english)
      ) {
        const stem = arabic.slice(0, arabic.length - pattern.length);
        const stemQualifies =
          stem.length >= PRODUCTIVE_PLURAL_MIN_STEM_LENGTH ||
          stem.startsWith(PRODUCTIVE_PLURAL_DEFINITE_PREFIX);
        if (stemQualifies) {
          return {
            component,
            arabicMatch: pattern,
            englishMatches: [],
            matchedInEnglish: false,
            role: component.role,
          };
        }
      }
      // Definite-article ال bypass: in genitive constructions ("of X"), English
      // often elides "the" but Arabic still has ال. Accept on long-enough
      // multi-word translations, except for fused forms (الله / الذي / etc).
      if (
        type === ComponentType.PREFIX &&
        pattern === 'ال' &&
        isMultiWordEnglish(english) &&
        arabic.length >= DEFINITE_ARTICLE_MIN_WORD_LENGTH &&
        !FUSED_AL_WORDS.has(arabic)
      ) {
        return {
          component,
          arabicMatch: pattern,
          englishMatches: [],
          matchedInEnglish: false,
          role: component.role,
        };
      }
      // Pronoun-compound candidate (deferred — see PRONOUN_COMPOUND_SUFFIXES docblock).
      // Recorded but not returned: a later component in the iteration may match an
      // English trigger and produce a better result.
      if (
        !pronounCompoundCandidate &&
        type === ComponentType.SUFFIX &&
        PRONOUN_COMPOUND_SUFFIXES.has(pattern) &&
        arabic.length === pattern.length &&
        isMultiWordEnglish(english)
      ) {
        const englishTokens = english.toLowerCase().split(/\s+/);
        const hasBlockingPronoun = englishTokens.some(t => PRONOUN_TOKENS_BLOCKING_BYPASS.has(t));
        if (!hasBlockingPronoun) {
          pronounCompoundCandidate = {
            component,
            arabicMatch: pattern,
            englishMatches: [],
            matchedInEnglish: false,
            role: component.role,
          };
        }
      }
    }
  }

  return pronounCompoundCandidate;
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
export function shouldInjectBracket(
  normalizedArabic: string,
  englishTranslation: string,
  originalArabic?: string,
): boolean {
  const hasDefiniteArticle =
    normalizedArabic.startsWith('ال') ||
    normalizedArabic.startsWith('بال') ||
    normalizedArabic.startsWith('لل') ||
    normalizedArabic.startsWith('كال');

  if (!hasDefiniteArticle) {
    return false;
  }

  // Tanween (ً ٌ ٍ) and definite article are mutually exclusive in Arabic grammar.
  // If the original word has tanween, the ال is part of the root (e.g., آلاف, آلة), not an article.
  const textToCheck = originalArabic || normalizedArabic;
  if (/[\u064B\u064C\u064D]/.test(textToCheck)) {
    return false;
  }

  const lowerEnglish = englishTranslation.toLowerCase();
  if (THE_WORD_REGEX.test(lowerEnglish)) {
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
        // Check if diacriticMatch appears as a whole word in a multi-word component match
        // (e.g., "he" in "he is") — uses split instead of regex for performance
        return componentMatch
          .split(/\s+/)
          .some(word => word === diacriticMatch);
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
