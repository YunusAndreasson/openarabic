/**
 * Arabic Word Analysis - Main Entry Point
 *
 * This module provides the main API for analyzing Arabic words and generating
 * colored segments for educational display. It coordinates functionality from
 * specialized sub-modules in @/utils/arabicAnalysis/.
 *
 * ## Data Flow (Color Resolution)
 *
 * ```
 * Arabic Word + English Translation
 *           ↓
 *     analyzeArabicWord() [this file]
 *           ↓
 *     WordAnalysis {
 *       prefixes: AnalyzedComponent[],  // each has role?: GrammaticalRole
 *       suffix, infix, diacritic        // each has role?: GrammaticalRole
 *     }
 *           ↓
 *     formatWordAnalysis() [colorSegments.ts]
 *       → getComponentColorName() resolves role → 'grammar.*' or type → flat color name
 *           ↓
 *     { reconstructedArabic: { segments: [{text, colorName, type}] } }
 *           ↓
 *     resolveColorName(colorName, themeColors) [colorResolution.ts]
 *       → Maps 'grammar.preposition' → colors.grammar.preposition (hex)
 *       → Maps 'tint' → colors.tint (hex)
 *           ↓
 *     Final hex color for rendering
 * ```
 *
 * ## Key Files
 * - constants/arabicWordComponents.ts - Rules, GrammaticalRole enum, GRAMMATICAL_ROLE_COLORS
 * - constants/colors.ts - createGrammarColors() factory for theme variants
 * - utils/colorResolution.ts - resolveColorName() single source of truth
 * - utils/arabicAnalysis/colorSegments.ts - Segment reconstruction with colors
 *
 * ## Public API
 * - analyzeArabicWord(arabic, english) - Analyze word for grammatical components
 * - computeColoredSegments(arabic, english, colors) - Generate colored segments for display
 * - formatWordAnalysis(analysis) - Format analysis for tooltip display
 * - clearAnalysisCache() - Clear caches (useful for testing)
 *
 * ## Types
 * - AnalyzedComponent - A detected grammatical component
 * - WordAnalysis - Complete analysis result
 */

import { ARABIC_SUFFIXES, ComponentType, GrammaticalRole } from '@/constants/arabicWordComponents';
import type { ColoredSegment } from '@/types/vocabulary.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { resolveColorName } from '@/utils/colorResolution';

// Import from sub-modules
import {
  // Cache
  ANALYSIS_CACHE,
  cacheWithLRUEviction,
  clearAnalysisCache,
  // Component Detection
  analyzeDiacriticMatches,
  areGrammaticallyRelated,
  findComponent,
  findDiacritic,
  findInfix,
  resolveOverlap,
  shouldInjectBracket,
  // Edge Cases
  isSingleStandaloneComponent,
  // Normalization
  expandContractions,
  normalizeArabic,
  normalizeEnglish,
  // Prefix Detection
  calculateRemainingEnglish,
  detectPrefixes,
  // Color Segments
  formatWordAnalysis,
  // Validation
  isHighRiskSuffix,
  // Types
  type AnalyzedComponent,
  type WordAnalysis,
} from './arabicAnalysis';
import {
  isCriticalLength,
  MIN_REMAINING_LENGTH,
  OVERLAP_REJECTION,
  WORD_COUNT,
} from './arabicAnalysis/validationConstants';

/** Subject pronouns that indicate verb conjugation, not suffix attachment */
const SUBJECT_PRONOUN_SET = new Set(['he', 'she', 'it', 'i', 'we', 'you', 'they']);

/** Object/possessive pronouns that indicate valid suffix attachment */
const OBJECT_POSSESSIVE_SET = new Set([
  'his', 'her', 'its', 'it', 'my', 'our', 'your', 'you', 'their', 'him', 'me', 'us', 'them',
]);
import { normalizeTranslation } from './arabicAnalysis/translationNormalization';

// Re-export types and functions for backwards compatibility
export type { AnalyzedComponent, WordAnalysis };
export { clearAnalysisCache, formatWordAnalysis, normalizeArabic, shouldInjectBracket };

/**
 * Main function to analyze an Arabic word and its English translation for components
 */
export function analyzeArabicWord(arabic: string, english: string): WordAnalysis {
  // STEP 1: Apply translation normalization FIRST
  // For specific Arabic words, always use consistent English translation
  // This enables proper component detection and consistent coloring
  const normalizedEnglish = normalizeTranslation(arabic, english);

  // Create cache key from normalized Arabic and NORMALIZED English
  const normalized = normalizeArabic(arabic);
  const cacheKey = `${normalized}|${normalizedEnglish}`;

  // Check cache first
  const cachedResult = ANALYSIS_CACHE.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check for bracket injection using shared logic FIRST
  // Bracket injection can turn single words into multi-word phrases
  const hasBracketInjection = shouldInjectBracket(normalized, normalizedEnglish);

  // CRITICAL: Single-word rule - no color-coding for educational clarity
  // This is the single source of truth for the single-word check
  //
  // CONTRACTION HANDLING: Expand contractions ONLY for word counting (e.g., "it's" → "it is")
  // Component detection still uses normalizedEnglish (unexpanded) to match actual text structure.
  // colorCodedTextUtils.ts handles contraction matching via bidirectional mapping (CONTRACTION_EXPANSIONS).
  const expandedEnglish = expandContractions(normalizedEnglish);
  const wordCount = expandedEnglish.trim().split(/\s+/).length;
  if (wordCount === WORD_COUNT.SINGLE && !hasBracketInjection) {
    // Only skip analysis if single word AND no bracket injection
    // If bracket injection is needed, callers will add "[the]" making it multi-word
    //
    // CONSISTENCY NOTE: This check is intentionally done BEFORE "[the]" is added.
    // colorCodedTextUtils.ts checks AFTER "[the]" is added (displayedText).
    // Both are logically equivalent:
    //   - Here: Skip if (1 word AND no bracket) → Continue if bracket present
    //   - There: Skip if displayedText is 1 word → displayedText is 2 words when bracket present
    const singleWordResult: WordAnalysis = {
      original: { arabic, english: normalizedEnglish },
      prefixes: [], // No prefixes for single words
      hasComponents: false,
      remainingArabic: normalized,
      remainingEnglish: normalizeEnglish(normalizedEnglish),
      hasBracketInjection,
    };

    cacheWithLRUEviction(ANALYSIS_CACHE, cacheKey, singleWordResult);

    return singleWordResult;
  }

  // Detect multiple prefixes sequentially
  const { prefixes: detectedPrefixes, remainingArabic: remainingAfterPrefixes } = detectPrefixes(
    normalized,
    normalizedEnglish,
    arabic, // Pass original Arabic for shadda detection
  );

  // CRITICAL: Detect suffix from remaining text AFTER prefixes to avoid false "hidden prefix" detection
  // Example: "تجده" → prefix "ت" detected → check suffix on "جده" (not full "تجده")
  // This prevents validation from incorrectly flagging already-detected prefixes as "hidden"
  let suffix = findComponent(
    remainingAfterPrefixes,
    normalizedEnglish,
    ARABIC_SUFFIXES,
    ComponentType.SUFFIX,
  );

  // ADDITIONAL VALIDATION: Prevent suffix from matching same English words as prefix
  // Example: "يكره" (he hates) → prefix ي matches "he", suffix ה shouldn't also match "he"
  // If prefix exists AND suffix English overlaps with prefix English AND remaining would be < 3 chars → reject suffix
  if (suffix && detectedPrefixes.length > 0) {
    const prefixEnglishWords = new Set<string>();
    detectedPrefixes.forEach(prefix => {
      prefix.englishMatches.forEach(match => {
        // Only check single-word patterns for overlap
        // Multi-word patterns like "of you" should not be split
        if (!match.includes(' ')) {
          prefixEnglishWords.add(match.toLowerCase());
        }
      });
    });

    const suffixEnglishWords = suffix.englishMatches
      .filter(match => !match.includes(' ')) // Only single-word patterns
      .map(match => match.toLowerCase());
    const hasOverlap = suffixEnglishWords.some(word => prefixEnglishWords.has(word));

    if (hasOverlap) {
      // Overlap detected - check if remaining is too short
      const remainingAfterSuffix = remainingAfterPrefixes.substring(
        0,
        remainingAfterPrefixes.length - suffix.arabicMatch.length,
      );

      // If remaining is exactly 2 chars and there's English overlap, likely a false positive
      // Real case: "يكره" → ي(he) + كره, removing ה leaves "كر" (2 chars) - FALSE POSITIVE
      // Valid case: "يكتبه" → ي + كتبה, removing ה leaves "כתב" (3+ chars) - OK
      // EXCEPTION: Allow 0-1 chars (prefix+suffix compounds like מִנָּא = מן + נא with no root)
      if (isCriticalLength(remainingAfterSuffix, OVERLAP_REJECTION.CRITICAL_LENGTH)) {
        suffix = undefined; // Reject this suffix as false positive
      }
      // If length is 0-1, it's a valid prefix+suffix compound (keep suffix)
      // If length is 3+, it's valid (keep suffix)
    }
  }

  // ADDITIONAL VALIDATION: Prevent high-risk suffix matching subject pronouns when no prefix exists
  // Example: "כרה" (he hates) → NO prefix, "he" is verb conjugation, not suffix ה
  // Example: "וجه" (he faced) → NO prefix, "he" is verb conjugation, not suffix ה
  // Valid case: "דמה" (his blood) → NO prefix, but "his" is possessive (valid suffix)
  // Valid case: "כנא" (we were) → NO prefix, "we" matches suffix נא (valid)
  // Only apply to high-risk suffixes (ה, הא, י, כ) that can be confused with root letters
  // EXTENDED VALIDATION: Apply to ALL high-risk suffixes (with or without prefixes)
  // Previously only checked when detectedPrefixes.length === 0, but false positives can occur with prefixes too
  // Example: "يكره" = "he hates" has prefix ي, but suffix ه is still false positive
  if (suffix && isHighRiskSuffix(suffix.arabicMatch)) {
    const remainingAfterSuffix = remainingAfterPrefixes.substring(
      0,
      remainingAfterPrefixes.length - suffix.arabicMatch.length,
    );

    if (remainingAfterSuffix.length < MIN_REMAINING_LENGTH.HIGH_RISK_SUFFIX) {
      // Check if English contains subject pronouns (these belong to verb conjugation, not suffixes)
      // Only check for pronouns that match the high-risk suffix (he/she/it/i)
      // Don't check "we" (נا suffix is almost always valid) or "you" (varied usage)
      const englishWords = normalizedEnglish.toLowerCase().split(/\s+/);
      const hasSubjectPronoun = englishWords.some(word => SUBJECT_PRONOUN_SET.has(word));
      const hasObjectPossessivePronoun = englishWords.some(word =>
        OBJECT_POSSESSIVE_SET.has(word),
      );

      if (hasSubjectPronoun && !hasObjectPossessivePronoun) {
        // ONLY subject pronoun present → must be verb conjugation, not suffix
        // Example: "كره" = "he hated" → only "he", no object → reject ה suffix
        suffix = undefined;
      } else if (hasSubjectPronoun && hasObjectPossessivePronoun) {
        // Both subject and object pronouns → verify suffix claims the object pronoun
        // Example: "رآها" = "he sees it" → "he" + "it" → keep ها if it claims "it"
        const suffixEnglishWords = suffix.englishMatches.flatMap(match =>
          match.toLowerCase().split(/\s+/),
        );
        const suffixClaimsObjectPronoun = englishWords.some(
          word => OBJECT_POSSESSIVE_SET.has(word) && suffixEnglishWords.includes(word),
        );

        if (!suffixClaimsObjectPronoun) {
          // Suffix doesn't claim object/possessive → false positive
          suffix = undefined;
        }
      }
      // If only object/possessive pronouns (no subject), keep suffix (e.g., "his blood")
    }
  }

  // Check for diacritics in the original text (before normalization)
  const diacritic = findDiacritic(arabic, normalizedEnglish);

  // Resolve overlaps between the last prefix and suffix (only last prefix can overlap with suffix)
  const lastPrefix =
    detectedPrefixes.length > 0 ? detectedPrefixes[detectedPrefixes.length - 1] : undefined;
  const { resolvedPrefix, resolvedSuffix } = resolveOverlap(normalized, lastPrefix, suffix);

  // If last prefix was removed due to overlap, remove it from the detected prefixes array
  let finalPrefixes = detectedPrefixes;
  if (lastPrefix && !resolvedPrefix) {
    finalPrefixes = detectedPrefixes.slice(0, -1);
  }

  // Calculate remaining Arabic text after removing all prefixes and suffix
  let remaining = remainingAfterPrefixes; // Already has prefixes removed
  if (resolvedSuffix)
    remaining = remaining.substring(0, remaining.length - resolvedSuffix.arabicMatch.length);

  // Look for infixes in the remaining text (pass all prefixes/suffix to filter false positives)
  const infix =
    remaining.length > MIN_REMAINING_LENGTH.INFIX_DETECTION
      ? findInfix(remaining, normalizedEnglish, finalPrefixes, resolvedSuffix)
      : undefined;

  // Smart diacritic resolution: filter, keep, or merge colors based on grammatical relationships
  let resolvedDiacritic: AnalyzedComponent | undefined;

  if (diacritic) {
    const matchAnalysis = analyzeDiacriticMatches(diacritic.englishMatches, [
      ...finalPrefixes, // Include all prefixes
      infix,
      resolvedSuffix,
    ]);

    // Special case: Pronoun suffix + diacritic (educational grouping)
    // Always inherit color for diacritics on pronoun suffixes, even without English overlap
    const isPronounSuffixPresent = resolvedSuffix?.role === GrammaticalRole.POSSESSIVE;

    if (isPronounSuffixPresent) {
      // Diacritic on pronoun suffix → inherit suffix color for visual grouping
      // Example: עَלَيْהِ → ה + ִ both colored purple (pronoun + case marker)
      resolvedDiacritic = {
        ...diacritic,
        inheritColorFrom: ComponentType.SUFFIX,
      };
    } else if (matchAnalysis.hasUnique) {
      // Case 1: Diacritic has unique English match → keep with its own color
      resolvedDiacritic = diacritic;
    } else if (matchAnalysis.overlappingComponent) {
      // Case 2: Diacritic overlaps with another component
      const isRelated = areGrammaticallyRelated(
        diacritic,
        matchAnalysis.overlappingComponent,
        matchAnalysis.overlappingMatches,
      );

      if (isRelated) {
        // Grammatically related → keep but inherit color from related component
        resolvedDiacritic = {
          ...diacritic,
          inheritColorFrom: matchAnalysis.overlappingComponent.component.type,
        };
      } else {
        // Not related → filter out to avoid redundant coloring
        resolvedDiacritic = undefined;
      }
    } else {
      // Case 3: No overlap (shouldn't happen, but handle gracefully)
      resolvedDiacritic = diacritic;
    }
  }

  // Calculate remaining English by removing matched component words
  const remainingEnglish = calculateRemainingEnglish(normalizedEnglish, {
    prefixes: finalPrefixes,
    suffix: resolvedSuffix,
    infix,
    diacritic: resolvedDiacritic,
  });

  // PERFORMANCE OPTIMIZATION: Skip color-coding for single standalone components
  // Educational principle: Standalone particles provide no compositional insight
  //
  // Examples that WILL be skipped:
  //   - "בל → but rather" - single conjunction, entire word consumed, no composition
  //   - "תم → then" - single particle, entire word consumed, no composition
  //   - "וָהوָ → and he" - conjunction + pronoun, pure particles, no composition
  //
  // Examples that will NOT be skipped (still colored):
  //   - "فإذا → so when" - 2 prefixes (ف + إذا), shows composition ✓
  //   - "والله → and by Allah" - prefix + remaining root, shows composition ✓
  //   - "כِתָאבٌ → book" - has diacritic, educational value ✓
  //   - "בِהِ → with him" - preposition + pronoun, shows composition ✓
  //
  // Performance benefit: Saves expensive color segment generation and rendering
  // for words that provide no educational value when colored.
  const isStandalone = isSingleStandaloneComponent(
    {
      prefixes: finalPrefixes,
      suffix: resolvedSuffix,
      infix,
      diacritic: resolvedDiacritic,
    },
    normalized,
  );

  const result: WordAnalysis = {
    original: { arabic, english: normalizedEnglish },
    prefixes: finalPrefixes, // Array of prefixes
    infix,
    suffix: resolvedSuffix,
    diacritic: resolvedDiacritic,
    // Override hasComponents to false if single standalone component (entire word is one particle)
    hasComponents: isStandalone
      ? false
      : Boolean(finalPrefixes.length > 0 || infix || resolvedSuffix || resolvedDiacritic),
    remainingArabic: remaining.trim(),
    remainingEnglish,
    hasBracketInjection,
  };

  cacheWithLRUEviction(ANALYSIS_CACHE, cacheKey, result);

  return result;
}

/**
 * Pre-computes colored segments for a word given theme colors
 * Used during data loading to avoid computing during render
 */
export function computeColoredSegments(
  arabicWord: string,
  englishTranslation: string,
  colors: ThemeColors,
): ColoredSegment[] {
  // Apply bracket injection if needed
  const normalizedArabic = normalizeArabic(arabicWord);
  const processedEnglish = shouldInjectBracket(normalizedArabic, englishTranslation)
    ? `[the] ${englishTranslation}`
    : englishTranslation;

  // Analyze word (single-word check happens inside analyzeArabicWord now)
  const analysis = analyzeArabicWord(arabicWord, processedEnglish);

  // Return plain text if no components found (includes single-word case)
  if (!analysis?.hasComponents) {
    return [{ text: arabicWord, color: colors.arabicText, type: 'root' as const }];
  }

  const formatted = formatWordAnalysis(analysis);
  if (!formatted?.reconstructedArabic) {
    return [{ text: arabicWord, color: colors.arabicText, type: 'root' as const }];
  }

  // Use resolveColorName for single source of truth color resolution
  return formatted.reconstructedArabic.segments.map(segment => ({
    text: segment.text,
    color: resolveColorName(segment.colorName, colors),
    type: segment.type as ColoredSegment['type'],
  }));
}
