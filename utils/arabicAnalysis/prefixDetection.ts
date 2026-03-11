/**
 * Prefix detection functions for Arabic word analysis
 */

import { ARABIC_PREFIXES, ComponentType, GrammaticalRole } from '@/constants/arabicWordComponents';

import { findComponent } from './componentDetection';
import { VALIDATION_CONFIG } from './constants';
import { hasEnglishMatch } from './englishMatching';
import { normalizeEnglish } from './normalization';
import type { AnalyzedComponent } from './types';
import {
  getShortenedPrepositionForm,
  isFormWithSuffixPattern,
  isHighRiskPreposition,
} from './validation';

/** Possessive indicators for shadda-based suffix detection (Validation 0) */
const POSSESSIVE_INDICATORS = ['my', 'me', 'of me'];

/** Single-letter prefixes that can appear after ال but are part of roots, not prepositions */
const SINGLE_LETTER_PREPOSITION_SET = new Set(['ب', 'ل', 'ك', 'م']);

/** Single-letter conjunctions/prepositions that can be confused with root radicals */
const SINGLE_LETTER_CONJUNCTION_SET = new Set(['و', 'ف', 'ب', 'ل']);

/**
 * Detects multiple prefixes in sequence from an Arabic word
 *
 * Arabic prefixes can stack (e.g., و + ال = وال "and the", ب + ال = بال "in the")
 * This function iteratively detects prefixes with multiple validation rules.
 */
export function detectPrefixes(
  normalizedArabic: string,
  english: string,
  originalArabic?: string,
): { prefixes: AnalyzedComponent[]; remainingArabic: string } {
  const detectedPrefixes: AnalyzedComponent[] = [];
  let remaining = normalizedArabic;
  const lowerEnglish = english.toLowerCase();

  // Track which roles we've seen to prevent duplicates
  const seenRoles = new Set<GrammaticalRole>();

  // Keep trying to find prefixes until none are found
  // This allows detecting multiple prefixes in sequence (e.g., و + ال, ب + ال, ف + ال)
  let continueDetection = true;
  let iterationCount = 0;
  const MAX_ITERATIONS = 5; // Safety limit to prevent infinite loops

  while (continueDetection && iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    const prefixMatch = findComponent(remaining, english, ARABIC_PREFIXES, ComponentType.PREFIX);

    if (prefixMatch) {
      // Extract role from the matched component
      let role = prefixMatch.component.role || GrammaticalRole.GENERIC;

      let remainingAfterPrefix = remaining.substring(prefixMatch.arabicMatch.length);

      // VALIDATION 0: Prefer shortened preposition form when shadda suffix would match
      // Problem: على/علي (3 chars) matches greedily over عل (2 chars), preventing suffix detection
      // Example: عَلَيَّ (upon me) → should be عل + يّ, not علي + (nothing)
      // Solution: If prefix is a "form with suffix" pattern (علي، لدي، إلي) and:
      //   1. No remaining text after prefix (consumed entire word)
      //   2. English has possessive pronouns
      //   3. Original Arabic ends with shadda (ّ) indicating possessive suffix
      // Then use the shortened form to allow suffix detection
      if (isFormWithSuffixPattern(prefixMatch.arabicMatch) && remainingAfterPrefix === '') {
        // Check if English has possessive pronouns that would match the suffix
        const hasPossessivePronoun = POSSESSIVE_INDICATORS.some(p => lowerEnglish.includes(p));

        // Check if original Arabic ends with shadda (indicating possessive suffix like يّ)
        const hasShadda = originalArabic?.includes('ّ') ?? false;

        if (hasPossessivePronoun && hasShadda) {
          // Try using shortened form to allow suffix detection
          const shortenedForm = getShortenedPrepositionForm(prefixMatch.arabicMatch);
          if (shortenedForm && remaining.startsWith(shortenedForm)) {
            // Find the shortened component pattern
            const shortenedComponent = ARABIC_PREFIXES.find(p => p.arabic === shortenedForm);
            if (shortenedComponent) {
              // Create new match with shortened form
              const shortenedEnglishMatches = hasEnglishMatch(
                english,
                shortenedComponent.english,
                remaining,
                shortenedForm,
              );
              if (shortenedEnglishMatches.length > 0) {
                // Replace the match with shortened form
                prefixMatch.component = shortenedComponent;
                prefixMatch.arabicMatch = shortenedForm;
                prefixMatch.englishMatches = shortenedEnglishMatches;
                // Recalculate remaining and role after using shortened form
                remainingAfterPrefix = remaining.substring(shortenedForm.length);
                role = shortenedComponent.role || GrammaticalRole.GENERIC;
              }
            }
          }
        }
      }

      // VALIDATION 1: Prevent duplicate definite article (ال)
      // Arabic grammar: only ONE definite article per word
      if (
        role === GrammaticalRole.DEFINITE_ARTICLE &&
        seenRoles.has(GrammaticalRole.DEFINITE_ARTICLE)
      ) {
        // Already have a definite article - reject this match and stop
        continueDetection = false;
        continue;
      }

      // VALIDATION 2: Prevent consuming entire word as prefixes in specific cases
      // 2a. Prevent breaking known nouns like "بال" (mind)
      // Specific case: after detecting "ال", don't detect "ب" if it would leave "ال" as root
      // This prevents: "البال" → "ال" + "ب" + "ال" (WRONG - ال is article, not a root)
      // Should be: "البال" → "ال" + "بال" (CORRECT - mind is the root)
      if (remainingAfterPrefix === 'ال') {
        // Accepting this prefix would leave just "ال" which is an article, not a root
        continueDetection = false;
        continue;
      }

      // VALIDATION 3: Prevent double-letter detection for assimilation cases
      // 3a. لله (lil-laahi) - ل + الله with divine names
      // Example: لِلَّهِ (for God) = ل (for) + الله (Allah with assimilated article)
      // BUT: ل + ل is VALID for regular nouns like للقلم (for the pen)
      const hasLamPrefix = detectedPrefixes.some(p => p.arabicMatch === 'ل');
      const isSingleLamMatch = prefixMatch.arabicMatch === 'ل'; // Not 'ال'
      const isDivineName =
        lowerEnglish.includes('god') ||
        lowerEnglish.includes('allah') ||
        lowerEnglish.includes('lord') ||
        remaining.includes('الله'); // Check if الله appears in remaining

      if (hasLamPrefix && isSingleLamMatch && isDivineName) {
        // Already have a lam prefix, this is another lam, and it's a divine name
        // Reject this match to keep الله intact
        continueDetection = false;
        continue;
      }

      // 3a-2. Assimilated definite article: لل = لِ + الْ (for the)
      // When ل appears after a ل preposition (non-divine), the second ل is the
      // definite article with elided alef, not another preposition.
      // Override role and English for correct educational coloring (golden, not amber).
      if (hasLamPrefix && isSingleLamMatch) {
        role = GrammaticalRole.DEFINITE_ARTICLE;
        prefixMatch.englishMatches = ['the'];
      }

      // 3b. مما (mimma) - من + ما assimilation
      // Example: مِمَّا (from what) = من (from) + ما (what) with assimilated ن
      // Pattern: After detecting م (shortened من), don't consume ما as another prefix
      // This leaves ما (what) as the root/remaining portion
      const hasMeemPrefix = detectedPrefixes.some(p => p.arabicMatch === 'م');
      const isMeemMatch = prefixMatch.arabicMatch === 'م';
      const isMaMatch = prefixMatch.arabicMatch === 'ما';

      // Block م + م (double meem)
      if (hasMeemPrefix && isMeemMatch) {
        // Already have a meem prefix, this is another meem - likely من + ما assimilation
        // Reject to prevent مما being detected as م + م + ا
        continueDetection = false;
        continue;
      }

      // Block م + ما (meem followed by ma)
      if (hasMeemPrefix && isMaMatch) {
        // Already detected م, and now trying to detect ما
        // This is the مما assimilation pattern: leave ما as root, not another prefix
        continueDetection = false;
        continue;
      }

      // VALIDATION 4: Prevent single-letter prepositions AFTER definite article
      // Arabic grammar: Prepositions come BEFORE ال (e.g., بال = bi-al), not after
      // Example: "البركة" (al-baraka) = ال + بركة, NOT ال + ب + ركة
      // Example: "المعاني" (al-ma'ani) = ال + معاني, NOT ال + م + عاني
      // The ب in بركة is part of the root ب-ر-ك (blessing), not a preposition
      // The م in معاني is part of the root م-ع-ن (meaning), not a preposition
      // "of" in English comes from the genitive case (kasra), not from these letters
      const hasDefiniteArticle = seenRoles.has(GrammaticalRole.DEFINITE_ARTICLE);
      const isSingleLetterPreposition =
        role === GrammaticalRole.PREPOSITION &&
        prefixMatch.arabicMatch.length === 1 &&
        SINGLE_LETTER_PREPOSITION_SET.has(prefixMatch.arabicMatch);

      if (hasDefiniteArticle && isSingleLetterPreposition) {
        // Already have definite article, and this is a single-letter preposition
        // Reject this match - prepositions come before ال, not after
        // Stop detection to preserve the root
        continueDetection = false;
        continue;
      }

      // VALIDATION 5: Reject high-risk prepositions when "of" appears mid-phrase
      // Problem: "م" matches "of" in idioms like "school of thought" where "of" isn't a grammatical preposition
      // Solution: Check if "of" appears between two content words (not at phrase boundaries)
      //
      // Examples:
      //   - "school of thought" → "of" at index 1 (between school and thought) → REJECT
      //   - "of the people" → "of" at index 0 (start of phrase) → ALLOW (if structural validation passed)
      //   - "because of" → "of" at index 1 (end of phrase) → ALLOW (if structural validation passed)
      if (isHighRiskPreposition(prefixMatch.arabicMatch)) {
        const normalizedEnglishPhrase = normalizeEnglish(english);
        const words = normalizedEnglishPhrase.split(/\s+/).filter(Boolean);

        // Check if any of the matched English patterns is "of" appearing mid-phrase
        const hasEmbeddedOf = prefixMatch.englishMatches.some(match => {
          const normalizedMatch = normalizeEnglish(match);
          if (normalizedMatch === 'of') {
            const matchIndex = words.indexOf('of');
            // Embedded = not at start (0) and not at end (length-1)
            return matchIndex > 0 && matchIndex < words.length - 1;
          }
          return false;
        });

        if (hasEmbeddedOf) {
          // "of" is embedded mid-phrase - likely part of an idiom, not a grammatical preposition
          continueDetection = false;
          continue;
        }
      }

      // VALIDATION 6: Prevent splitting يت (Form VI verb pattern: يَتَفَاعَلُ)
      // Arabic verb morphology: يَتَ together indicates Form VI (mutual/reciprocal action)
      // Example: يَتَدَارَسُ (ya-ta-dārasu) = "studying together" (Form VI from root د-ر-س)
      // Correct: و + يتدارس (conjunction + Form VI verb)
      // Incorrect: و + ي + ت + دارس (conjunction + subject prefix + subject prefix + root)
      //
      // Form VI characteristics:
      //   - Present tense: يَتَفَاعَلُ (ya-ta-fāʿalu) - 3rd person masculine singular
      //   - Past tense: تَفَاعَلَ (ta-fāʿala)
      //   - The تَ in Form VI is part of the verb form pattern, not a separate subject marker
      //
      // Examples where this applies:
      //   - يَتَعَاوَنُ (ya-taʿāwanu) = "he cooperates" (Form VI from ع-و-ن)
      //   - يَتَبَادَلُ (ya-tabādalu) = "he exchanges" (Form VI from ب-د-ل)
      //   - يَتَشَارَكُ (ya-tashāraku) = "he shares" (Form VI from ش-ر-ك)
      //
      // Strategy: Look ahead when matching ي to see if ت follows immediately
      // If ي is followed by ت, reject ي to keep يت together
      const isYaMatch = prefixMatch.arabicMatch === 'ي';
      const isTaMatch = prefixMatch.arabicMatch === 'ت';

      if (isYaMatch && remainingAfterPrefix.startsWith('ت')) {
        // Matched ي and next char is ت - this is Form VI pattern
        // Reject ي to keep يت together as part of the verb form
        continueDetection = false;
        continue;
      }

      if (isTaMatch) {
        // Check if ي was previously detected - if so, this is the ت that should have been kept with ي
        const hasYaPrefix = detectedPrefixes.some(p => p.arabicMatch === 'ي');
        if (hasYaPrefix) {
          // Already detected ي, now seeing ت - this is Form VI pattern (fallback check)
          // This shouldn't happen if the ي check above worked, but added for safety
          continueDetection = false;
          continue;
        }
      }

      // VALIDATION 7: Prevent conjunctions/prepositions after subject markers with insufficient root
      // Problem: Form V/Form II verbs have root radicals (و، ي) that match conjunction/preposition patterns
      // Example: تَوَدَّدَ (ta-waddada) = Form V verb from root و-د-د (to show affection)
      // Incorrect: و + ت + و + دد (3 prefixes, treating و as conjunction twice)
      // Correct: و + تودد (1 prefix + Form V verb, where second و is first radical)
      //
      // Form V characteristics:
      //   - Pattern: تَفَعَّلَ (ta-faʿʿala) - reflexive/intensive form
      //   - First radical can be و or ي, which match conjunction patterns
      //   - After subject marker ت, the following و/ي is part of the root, not a prefix
      //
      // Examples where this applies:
      //   - وَتَوَدَّدْ = و (and) + تودد (Form V: you show affection)
      //   - وَيَوَدُّ = و (and) + يود (he loves) - و is root radical, not conjunction
      //   - فَتَبَيَّنَ = ف (so) + تبين (Form V: it became clear) - ي is root radical
      //
      // Strategy: After detecting subject marker (ت، ي، ن، أ), don't allow single-letter
      // conjunctions/prepositions (و، ف، ب، ل) if they would leave < 3 chars remaining.
      // This prevents splitting root radicals that happen to match prefix patterns.
      const hasSubjectMarker = detectedPrefixes.some(p =>
        VALIDATION_CONFIG.SUBJECT_MARKERS.includes(
          p.arabicMatch as (typeof VALIDATION_CONFIG.SUBJECT_MARKERS)[number],
        ),
      );
      const isSingleLetterConjunctionOrPreposition = SINGLE_LETTER_CONJUNCTION_SET.has(
        prefixMatch.arabicMatch,
      );

      if (hasSubjectMarker && isSingleLetterConjunctionOrPreposition) {
        // Check if accepting this prefix would leave insufficient root structure
        if (remainingAfterPrefix.length < 3) {
          // Would leave < 3 chars - this "prefix" is likely a root radical
          // Example: After detecting و + ت, seeing another و with "دد" remaining
          // The second و is part of root و-د-د, not a conjunction
          continueDetection = false;
          continue;
        }
      }

      // VALIDATION 8: Suppress subject marker after future tense or negation prefixes
      // Problem: ي subject marker detected after س/سوف/لا/لم/لن is redundant
      // The future/negation prefix already implies the verb conjugation form
      // Example: سيذهب (he will go) = س (future) + يذهب (he goes)
      //   - Correct: detect [س] - future prefix indicates the tense
      //   - Incorrect: detect [س, ي] - ي is implicit in the verb form, not a separate prefix
      // Example: لايعرف (does not know) = لا (not) + يعرف (he knows)
      //   - Correct: detect [لا] - negation prefix
      //   - Incorrect: detect [لا, ي] - ي is part of the verb, not an additional prefix
      //
      // Strategy: If current match is a subject marker (ي، ت، ن، أ) and we already
      // have a future tense (س، سوف) or negation (لا، لم، لن) prefix, suppress it.
      const hasFutureOrNegationPrefix = detectedPrefixes.some(
        p =>
          (VALIDATION_CONFIG.FUTURE_TENSE_PREFIXES as readonly string[]).includes(
            p.arabicMatch,
          ) ||
          (VALIDATION_CONFIG.NEGATION_PREFIXES as readonly string[]).includes(p.arabicMatch),
      );
      const isSubjectMarkerMatch = VALIDATION_CONFIG.SUBJECT_MARKERS.includes(
        prefixMatch.arabicMatch as (typeof VALIDATION_CONFIG.SUBJECT_MARKERS)[number],
      );

      if (hasFutureOrNegationPrefix && isSubjectMarkerMatch) {
        // Subject marker is implicit in the verb after future/negation - don't detect separately
        continueDetection = false;
        continue;
      }

      // All validations passed - accept this prefix
      seenRoles.add(role);

      const analyzedPrefix: AnalyzedComponent = {
        ...prefixMatch,
        role,
        position: detectedPrefixes.length,
      };

      detectedPrefixes.push(analyzedPrefix);

      // Remove matched prefix from remaining text
      remaining = remainingAfterPrefix;
    } else {
      // No more prefixes found
      continueDetection = false;
    }
  }

  return { prefixes: detectedPrefixes, remainingArabic: remaining };
}

/**
 * Calculate remaining English words after removing words matched by components
 * @param originalEnglish - The original English translation
 * @param components - All detected components (prefixes, suffix, infix, diacritic)
 * @returns Remaining English words that weren't matched by any component
 */
export function calculateRemainingEnglish(
  originalEnglish: string,
  components: {
    prefixes: AnalyzedComponent[];
    suffix?: AnalyzedComponent;
    infix?: AnalyzedComponent;
    diacritic?: AnalyzedComponent;
  },
): string {
  // Collect all English matches from all components
  const matchedWords = new Set<string>();

  // Add prefix matches
  components.prefixes.forEach(prefix => {
    prefix.englishMatches.forEach(match => {
      // Split multi-word matches and add each word
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  });

  // Add suffix matches
  if (components.suffix) {
    components.suffix.englishMatches.forEach(match => {
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  }

  // Add infix matches
  if (components.infix) {
    components.infix.englishMatches.forEach(match => {
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  }

  // Add diacritic matches
  if (components.diacritic) {
    components.diacritic.englishMatches.forEach(match => {
      match
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => matchedWords.add(word.trim()));
    });
  }

  // Remove matched words from original English
  const words = originalEnglish.toLowerCase().split(/\s+/);
  const remainingWords = words.filter(word => {
    const trimmed = word.trim();
    return trimmed && !matchedWords.has(trimmed);
  });

  return remainingWords.join(' ');
}
