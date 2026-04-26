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

      // VALIDATION 1b: Prevent same single-letter prefix appearing twice
      // Arabic never stacks the same single letter as a prefix twice.
      // Example: بلبناني → ب + لبناني (ل is root, not preposition)
      // Example: ففعلوا → ف + فعلوا (second ف is root of فعل, not conjunction)
      //
      // Exception: لل is the assimilated definite article (ل preposition + ال article).
      // Validation 3a-2 below relabels the second ل as DEFINITE_ARTICLE.
      if (prefixMatch.arabicMatch.length === 1) {
        const sameLetterAlreadyDetected = detectedPrefixes.some(
          p => p.arabicMatch === prefixMatch.arabicMatch,
        );
        // Allow لل (assimilated article), reject all other same-letter duplicates
        if (sameLetterAlreadyDetected && prefixMatch.arabicMatch !== 'ل') {
          continueDetection = false;
          continue;
        }
        // For single-letter prepositions: also reject different-letter duplicates
        // (only one preposition per word — بل is never ب+ل as two prepositions)
        if (
          role === GrammaticalRole.PREPOSITION &&
          SINGLE_LETTER_PREPOSITION_SET.has(prefixMatch.arabicMatch)
        ) {
          const isLamAfterLam =
            prefixMatch.arabicMatch === 'ل' &&
            detectedPrefixes.some(p => p.arabicMatch === 'ل');
          if (!isLamAfterLam) {
            const hasSingleLetterPreposition = detectedPrefixes.some(
              p =>
                p.role === GrammaticalRole.PREPOSITION &&
                p.arabicMatch.length === 1 &&
                SINGLE_LETTER_PREPOSITION_SET.has(p.arabicMatch),
            );
            if (hasSingleLetterPreposition) {
              continueDetection = false;
              continue;
            }
          }
        }
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

      // Block م + من (meem followed by man)
      // Example: مِمَّنْ (from whoever) = من + من with assimilated ن
      // After detecting م (shortened من), leave من as root (= مَن "who/whoever")
      const isManMatch = prefixMatch.arabicMatch === 'من';
      if (hasMeemPrefix && isManMatch) {
        continueDetection = false;
        continue;
      }

      // VALIDATION 4: No prefixes AFTER definite article
      // Arabic grammar: The definite article (ال or assimilated لل) always immediately
      // precedes the noun. Nothing comes between the article and the root.
      // Example: "البركة" = ال + بركة, NOT ال + ب + ركة (ب is root)
      // Example: "للفرجة" = ل + ل + فرجة, NOT ل + ل + ف + رجة (ف is root)
      if (seenRoles.has(GrammaticalRole.DEFINITE_ARTICLE)) {
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

      // VALIDATIONS 6-8: Subject marker handling
      // Subject markers (ي، ت، ن، أ) are verb conjugation prefixes (he/she/we/I).
      // They're valid colorable prefixes, but detection must stop after them to prevent
      // cascading into the verb root.
      const isCurrentSubjectMarker = VALIDATION_CONFIG.SUBJECT_MARKERS.includes(
        prefixMatch.arabicMatch as (typeof VALIDATION_CONFIG.SUBJECT_MARKERS)[number],
      );

      if (isCurrentSubjectMarker) {
        // VALIDATION 6: Form V/VI verb patterns (يَتَفَعَّلُ / يَتَفَاعَلُ)
        // When subject marker is followed by ت, the ت is part of the verb form (not a prefix).
        // Accept the subject marker but stop detection to prevent ت from being a second prefix.
        // Examples: يتكلم "he speaks" → [ي] + تكلم, تتكلم "she speaks" → [ت] + تكلم
        if (remainingAfterPrefix.startsWith('ت')) {
          continueDetection = false;
        }

        // VALIDATION 8: After future tense (س/سوف) or negation (لا/لم/لن)
        // The subject marker IS valid — accept it but stop further detection.
        // Examples: سيذهب "he will go" → [س,ي] + ذهب, لايعلم "does not know" → [لا,ي] + علم
        const hasFutureOrNegation = detectedPrefixes.some(
          p =>
            (VALIDATION_CONFIG.FUTURE_TENSE_PREFIXES as readonly string[]).includes(
              p.arabicMatch,
            ) ||
            (VALIDATION_CONFIG.NEGATION_PREFIXES as readonly string[]).includes(p.arabicMatch),
        );
        if (hasFutureOrNegation) {
          continueDetection = false;
        }
      }

      // VALIDATION 7: Prevent conjunctions/prepositions after subject markers with insufficient root
      // After a subject marker, single-letter conjunctions (و، ف، ب، ل) with < 3 chars remaining
      // are likely root radicals, not prefixes.
      // Example: وتودد → و + تودد (Form V), NOT و + ت + و + دد
      const hasSubjectMarker = detectedPrefixes.some(p =>
        VALIDATION_CONFIG.SUBJECT_MARKERS.includes(
          p.arabicMatch as (typeof VALIDATION_CONFIG.SUBJECT_MARKERS)[number],
        ),
      );

      if (
        hasSubjectMarker &&
        SINGLE_LETTER_CONJUNCTION_SET.has(prefixMatch.arabicMatch) &&
        remainingAfterPrefix.length < 3
      ) {
        continueDetection = false;
        continue;
      }

      // VALIDATION 9: Prevent future/negation after subject marker
      // Arabic word order: future/negation ALWAYS precedes subject marker (سيذهب not يسذهب)
      // If a subject marker (ي/ت/ن/أ) was already detected, any following س/لا/لم/لن
      // is a root letter, not a future/negation prefix.
      // Example: يَسَّرَ "He will make easy" → ي(subject) + سّر(root), NOT ي+س(future)+ر
      // Example: يسمعه "will hear it" → ي(subject) + سمع(root), NOT ي+س(future)+مع
      if (hasSubjectMarker) {
        const isFutureOrNegation =
          (VALIDATION_CONFIG.FUTURE_TENSE_PREFIXES as readonly string[]).includes(
            prefixMatch.arabicMatch,
          ) ||
          (VALIDATION_CONFIG.NEGATION_PREFIXES as readonly string[]).includes(
            prefixMatch.arabicMatch,
          );
        if (isFutureOrNegation) {
          continueDetection = false;
          continue;
        }
      }

      // VALIDATION 5a: Reject ف+'for' when ب already detected.
      // ب prepositions like "for" already consumed the trigger; the ف on the remaining stem
      // is a root letter (e.g., بِفُلاَنٍ "for someone" — ف is root letter of فلان).
      if (
        prefixMatch.arabicMatch === 'ف' &&
        prefixMatch.englishMatches.length === 1 &&
        prefixMatch.englishMatches[0]?.toLowerCase() === 'for' &&
        detectedPrefixes.some(p => p.arabicMatch === 'ب')
      ) {
        continueDetection = false;
        continue;
      }

      // VALIDATION 5b: Gated ف+'and' acceptance.
      // ف is a sequential conjunction ("so/then/and"); when its sole English match is 'and',
      // reject if a و prefix has already been detected in the same word.
      // Catches وَفَسَادُ "and corruption" where ف is a root letter (root ف-س-د) but the
      // English "and" would otherwise match — و has already consumed the conjunction, so a
      // second 'and'-only match on ف is structurally impossible.
      if (
        prefixMatch.arabicMatch === 'ف' &&
        prefixMatch.englishMatches.length === 1 &&
        prefixMatch.englishMatches[0]?.toLowerCase() === 'and' &&
        detectedPrefixes.some(p => p.arabicMatch === 'و')
      ) {
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
