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
import { normalizeArabic } from './normalization';
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
  'ال', // ← آل, "family / came to" — the whole word, no stem
  'الى', // ← إلى, preposition "to"
  'الي', // ← إليّ, "to me"
  'اليه', // ← إليه, "to him"
  'اليها', // ← إليها, "to her/it"
  'اليهم', // ← إليهم, "to them"
  'اليهما', // ← إليهما, "to them both"
  'اليهن', // ← إليهن, "to them (f)"
  'اليك', // ← إليك, "to you"
  'اليكم', // ← إليكم, "to you all"
  'اليكما', // ← إليكما, "to you both"
  'الينا', // ← إلينا, "to us"
  'الا', // ← إلا, "except"
  'اله', // ← إله, "god"
  'الها', // ← إلها, "god" (acc)
  'الهي', // ← إلهي, "my god"
]);

/**
 * Whether the word's own spelling rules out its opening alef being the definite
 * article's.
 *
 * `normalizeArabic` folds أ/إ/آ/ٱ into a bare ا, after which إِلَهِيَّتِهِ "His
 * Divinity" and اِلْتِفَاتُهُ "his turning" are indistinguishable from a genuine
 * ال-word — so both painted their root letters in the article's colour. The
 * original spelling still carries the distinction:
 *
 * - The article's alef is a hamzat waṣl. It is written bare (ا) or with waṣla
 *   (ٱ), never with hamza — أَلَمْ, إِلَى and آلَاف are not articles.
 * - It never carries a kasra. A kasra'd alef is the prosthetic alef of form VII
 *   and VIII (اِلْتِفَات, اِعْتِرَاض), where the lām is a root letter.
 *
 * Checked across the corpus: of the words opening with أ or إ + lām, none gloss
 * with "the"; of 138 kasra-alef forms, 3 do (and those are form VIII verbal
 * nouns whose "the" belongs to a later word). Waṣla-alef words are left alone —
 * 55 of 106 are genuine articles.
 */
export function hasNonArticleAlef(originalArabic: string | undefined): boolean {
  if (!originalArabic) return false;
  const first = originalArabic[0];
  if (first === 'أ' || first === 'إ' || first === 'آ') return true;
  return first === 'ا' && originalArabic[1] === 'ِ';
}

const ENGLISH_TOKEN_REGEX = /\s+/;
/**
 * Shortened preposition/particle forms (على→عل, إلى→إل, لدى→لد, حتى→حت) exist ONLY
 * for the possessive-ي case (عَلَيَّ → عل + يّ). Without a following ي they are root
 * letters: عَلَّمَنِيهَا "He taught them to me" starts with the root علّم, and آلَ "led to"
 * normalizes to ال which the hamza-insensitive matcher would otherwise read as إل.
 */
const SHORTENED_PREPOSITION_FORMS = new Set(['عل', 'إل', 'لد', 'حت']);

/**
 * Unified function to find components (prefix, infix, suffix, or diacritic)
 */
export function findComponent(
  arabic: string,
  english: string,
  components: WordComponent[],
  type: ComponentType,
): AnalyzedComponent | undefined {
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
      // The dual-subject marker َا only attaches to a verb stem (قَالَا "they two said").
      // On 2-letter particles the fatha-alef is the word itself, not a morpheme —
      // without this guard لَا "They cannot" painted its َا as "They".
      if (matches && pattern === 'َا' && normalizeArabic(arabic).length < 3) {
        matches = false;
      }
    }

    // PREFIX validation: fused definite article. الذي / إليه / آل etc. must never
    // match ال — not even when the English contains "the" (regular match path).
    // Guarding only the bypass let إِلَيْهِ paint ال as "the" whenever bracket
    // injection or a genuine "the" appeared in the gloss.
    if (
      matches &&
      type === ComponentType.PREFIX &&
      pattern === 'ال' &&
      FUSED_AL_WORDS.has(arabic)
    ) {
      matches = false;
    }

    // PREFIX validation: shortened preposition forms require the possessive ي they
    // exist for (see SHORTENED_PREPOSITION_FORMS docblock).
    if (
      matches &&
      type === ComponentType.PREFIX &&
      SHORTENED_PREPOSITION_FORMS.has(pattern) &&
      arabic[normalizeAlef(pattern).length] !== 'ي'
    ) {
      matches = false;
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

          // The relaxation now only fires when `remaining` is a known preposition
          // (إلي, علي, لدي) — those are the genuine ـيه stem+suffix cases (إِلَيْهِ
          // "toward him"). Tightening earlier "any English pronoun" relaxation prevents
          // FPs like سفيه "his foolish" where ه is a root letter.
          const isFa3eelPattern = potentialFa3eelPattern && !isKnownPreposition;

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
      // NOTE: the former no-English-match bypasses (productive plural, ال-elision,
      // pronoun compound) were removed — they emitted englishMatches=[] which the
      // UI-symmetry filter in arabicWordAnalysis.ts drops unconditionally, so they
      // could never paint and only shadowed later components with real triggers.
      // The ال-elision case is covered by [the] bracket injection instead.
    }
  }

  return undefined;
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
    const tokenize = (match: string): string[] => match.toLowerCase().split(ENGLISH_TOKEN_REGEX);
    const claimedWords = new Set<string>();
    const claim = (match: string) => {
      for (const word of tokenize(match)) claimedWords.add(word);
    };

    for (const prefix of prefixes) {
      for (const match of prefix.englishMatches) claim(match);
    }
    if (suffix) {
      for (const match of suffix.englishMatches) claim(match);
    }

    const allClaimed = result.englishMatches.every(match =>
      tokenize(match).every(word => claimedWords.has(word)),
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

  // Fused-ال words (الذي, إليه→اليه, آل→ال, …) have no separable article — injecting
  // "[the]" fabricates English the word doesn't contain (إِلَيْهِ → "the toward him").
  // Check the ال-bearing tail: whole word for ال…, minus the preposition for بال…/كال…,
  // and ا + tail for the assimilated لل… (لل = ل + الْ with elided alef).
  const alBearingTail = normalizedArabic.startsWith('لل')
    ? `ا${normalizedArabic.slice(1)}`
    : normalizedArabic.startsWith('بال') || normalizedArabic.startsWith('كال')
      ? normalizedArabic.slice(1)
      : normalizedArabic;
  if (FUSED_AL_WORDS.has(alBearingTail)) {
    return false;
  }

  // A hamza'd or kasra'd alef is not the article's, so there is no article to
  // supply an English "the" for (إِلَهِيَّتِهِ read as "[the] His Divinity").
  if (hasNonArticleAlef(originalArabic)) {
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
    lowerEnglish.includes('most high') ||
    // Gloss already romanizes the article ("al-Sufi", "al-Milal") — injecting
    // "[the]" would double it: "[the] al-Sufi".
    lowerEnglish.includes('al-');

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
        return componentMatch.split(/\s+/).some(word => word === diacriticMatch);
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
