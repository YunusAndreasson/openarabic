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

import * as Sentry from '@sentry/react-native';

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
  MIN_REMAINING_LENGTH,
  OVERLAP_REJECTION,
  WORD_COUNT,
} from './arabicAnalysis/validationConstants';

/** Subject pronouns that indicate verb conjugation, not suffix attachment */
const SUBJECT_PRONOUN_SET = new Set(['he', 'she', 'it', 'i', 'we', 'you', 'they']);

/** Object/possessive pronouns that indicate valid suffix attachment */
const OBJECT_POSSESSIVE_SET = new Set([
  'his',
  'her',
  'its',
  'it',
  'my',
  'our',
  'your',
  'you',
  'their',
  'him',
  'me',
  'us',
  'them',
]);

const REGEX_ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (s: string): string => s.replace(REGEX_ESCAPE_RE, '\\$&');

/** Cached word-boundary regexes for English token matching. Keyed by lowercased token.
 *  English vocabulary in component triggers is small and bounded, so these caches stay tiny. */
const TOKEN_BOUNDARY_REGEX_CACHE = new Map<string, RegExp>();
const TOKEN_BOUNDARY_REGEX_GLOBAL_CACHE = new Map<string, RegExp>();
function getTokenBoundaryRegex(token: string): RegExp {
  let re = TOKEN_BOUNDARY_REGEX_CACHE.get(token);
  if (!re) {
    re = new RegExp(`(^|[^\\p{L}])${escapeRegex(token)}([^\\p{L}]|$)`, 'u');
    TOKEN_BOUNDARY_REGEX_CACHE.set(token, re);
  }
  return re;
}
function getTokenBoundaryRegexGlobal(token: string): RegExp {
  let re = TOKEN_BOUNDARY_REGEX_GLOBAL_CACHE.get(token);
  if (!re) {
    re = new RegExp(`(^|[^\\p{L}])${escapeRegex(token)}([^\\p{L}]|$)`, 'gu');
    TOKEN_BOUNDARY_REGEX_GLOBAL_CACHE.set(token, re);
  }
  return re;
}
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

  // Create cache key from ORIGINAL Arabic (preserves diacritics for correct reconstruction)
  // and normalized English. Different diacritizations of the same word get separate cache
  // entries because reconstruction uses the original text for display.
  const normalized = normalizeArabic(arabic);
  const cacheKey = `${arabic}|${normalizedEnglish}`;

  // Check cache first
  const cachedResult = ANALYSIS_CACHE.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Check for bracket injection using shared logic FIRST
  // Bracket injection can turn single words into multi-word phrases
  const hasBracketInjection = shouldInjectBracket(normalized, normalizedEnglish, arabic);

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
    const overlappingWords = suffixEnglishWords.filter(word => prefixEnglishWords.has(word));

    if (overlappingWords.length > 0) {
      // If any overlapping word appears ≥2 times in the English translation, the
      // prefix and suffix can each claim a distinct occurrence — e.g.,
      // يَشُقُّهَا "it splits it open" where 'it' is both subject (prefix ي) and
      // object (suffix ها). Skip the false-positive rejection in that case.
      const englishTokens = normalizedEnglish.toLowerCase().split(/\s+/);
      const hasRepeatedOverlap = overlappingWords.some(
        word => englishTokens.filter(token => token === word).length >= 2,
      );

      if (!hasRepeatedOverlap) {
        // Overlap detected - check if remaining is too short
        const remainingAfterSuffix = remainingAfterPrefixes.substring(
          0,
          remainingAfterPrefixes.length - suffix.arabicMatch.length,
        );

        // If remaining is exactly 2 chars and there's English overlap, likely a false positive
        // Real case: "يكره" → ي(he) + كره, removing ה leaves "كر" (2 chars) - FALSE POSITIVE
        // Valid case: "يكتبه" → ي + كتبה, removing ה leaves "כتب" (3+ chars) - OK
        // EXCEPTION: Allow 0-1 chars (prefix+suffix compounds like מِنָّا = מن + נا with no root)
        if (remainingAfterSuffix.length === OVERLAP_REJECTION.CRITICAL_LENGTH) {
          suffix = undefined; // Reject this suffix as false positive
        }
        // If length is 0-1, it's a valid prefix+suffix compound (keep suffix)
        // If length is 3+, it's valid (keep suffix)
      }
    }
  }

  // UNIVERSAL: A suffix that consumes the entire word with no prefix is a standalone pronoun, not a suffix.
  // Example: "هُوَ" (he/it) → suffix "هو" leaves nothing → it's a pronoun, not a suffix.
  if (suffix && detectedPrefixes.length === 0) {
    const leftover = remainingAfterPrefixes.substring(
      0,
      remainingAfterPrefixes.length - suffix.arabicMatch.length,
    );
    if (leftover.length === 0) {
      suffix = undefined;
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

    // When remaining is 0 AND prefixes exist, it's a prefix+suffix compound (أنّه, فيه, بها).
    // Skip subject-pronoun validation — the suffix IS the pronoun, not a verb conjugation marker.
    const isPrefixSuffixCompound = remainingAfterSuffix.length === 0 && detectedPrefixes.length > 0;
    if (
      !isPrefixSuffixCompound &&
      remainingAfterSuffix.length < MIN_REMAINING_LENGTH.HIGH_RISK_SUFFIX
    ) {
      // Check if English contains subject pronouns (these belong to verb conjugation, not suffixes)
      // Only check for pronouns that match the high-risk suffix (he/she/it/i)
      // Don't check "we" (נا suffix is almost always valid) or "you" (varied usage)
      const englishWords = normalizedEnglish.toLowerCase().split(/\s+/);
      const hasSubjectPronoun = englishWords.some(word => SUBJECT_PRONOUN_SET.has(word));
      const hasObjectPossessivePronoun = englishWords.some(word => OBJECT_POSSESSIVE_SET.has(word));

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
  // UI-symmetry filter: drop any component whose englishMatches is empty.
  // The Arabic-side renderer paints a component whenever it exists; the English-side
  // renderer (utils/colorCodedTextUtils.ts) only paints when englishMatches finds the
  // tokens in the displayed English. Bypass paths in componentDetection.ts (productive
  // plural, ال-elision, pronoun-compound) emit components with englishMatches=[] for
  // analyzer-recall reasons — this surfaces in the UI as Arabic-painted-no-English-painted,
  // a P0 visual asymmetry. Keep the analyzer's pairing invariant honest by dropping those
  // components before downstream consumers (renderer + benchmark) see them.
  //
  // Also drop components whose englishMatches reference tokens NOT actually in the displayed
  // English (e.g., ال bypass setting englishMatches=['the'] when the english elides "the").
  // Use the expanded form so contractions like "don't" still allow matches on 'not'.
  const lowerEnglish = expandContractions(normalizedEnglish).toLowerCase();
  const englishContainsAnyMatch = (matches: readonly string[]) =>
    matches.some(m => getTokenBoundaryRegex(m.toLowerCase()).test(lowerEnglish));

  const isVisible = (c: AnalyzedComponent | undefined): c is AnalyzedComponent =>
    !!c && c.englishMatches.length > 0 && englishContainsAnyMatch(c.englishMatches);

  let visiblePrefixes = finalPrefixes.filter(isVisible);
  let visibleSuffix = isVisible(resolvedSuffix) ? resolvedSuffix : undefined;
  let visibleInfix = isVisible(infix) ? infix : undefined;
  let visibleDiacritic = isVisible(resolvedDiacritic) ? resolvedDiacritic : undefined;

  // Occurrence-aware filter: when two components claim the same English word and that word
  // appears fewer times than the number of claimers, only the higher-priority component (prefix
  // > infix > suffix; left-to-right within prefixes) survives. The renderer cannot paint the
  // same English token in two different colors — without this, تَصْبِرُوا "you are patient" would
  // show ت + وا both colored in Arabic but only one "you" painted in English (asymmetric).
  // یَشُقُّهَا "it splits it open" stays whole because English has two "it"s.
  const countOccurrences = (token: string) =>
    (lowerEnglish.match(getTokenBoundaryRegexGlobal(token)) ?? []).length;
  const remainingOccurrences = new Map<string, number>();
  const ensureToken = (t: string) => {
    if (!remainingOccurrences.has(t)) remainingOccurrences.set(t, countOccurrences(t));
  };
  const claimOne = (c: AnalyzedComponent): boolean => {
    for (const m of c.englishMatches) {
      const t = m.toLowerCase();
      ensureToken(t);
      const remaining = remainingOccurrences.get(t) ?? 0;
      if (remaining > 0) {
        remainingOccurrences.set(t, remaining - 1);
        return true;
      }
    }
    return false;
  };
  // English SVO claim priority: an object/possessive pronoun in non-initial position
  // is the verb's object and belongs to the object suffix, not to a subject prefix
  // that shares the trigger. يَدْفَعَهَا "repels it": 'it' translates ها — without this,
  // prefix ي claimed the only 'it' and the UI taught that يَ means "it" while the
  // actual object pronoun ها stayed unpainted. An English-initial pronoun ("you are
  // patient") stays with the prefix — initial position marks the subject.
  // The steal only fires when contention is total — the suffix has no claimable token
  // of its own. With an uncontested token available (وَيَأْمُرُهُ "and it instructs him":
  // suffix ه can take 'him'), normal order stands and ي keeps its subject 'it'.
  const englishFirstToken = lowerEnglish.trim().split(/\s+/)[0] ?? '';
  let suffixClaimedEarly = false;
  if (visibleSuffix) {
    const prefixTokens = new Set(
      visiblePrefixes.flatMap(p => p.englishMatches.map(m => m.toLowerCase())),
    );
    const claimables = visibleSuffix.englishMatches
      .map(m => m.toLowerCase())
      .filter(t => {
        ensureToken(t);
        return (remainingOccurrences.get(t) ?? 0) > 0;
      });
    const allContested = claimables.length > 0 && claimables.every(t => prefixTokens.has(t));
    const first = claimables[0];
    if (allContested && first && OBJECT_POSSESSIVE_SET.has(first) && first !== englishFirstToken) {
      suffixClaimedEarly = claimOne(visibleSuffix);
    }
  }
  const claimedPrefixes: AnalyzedComponent[] = [];
  for (const p of visiblePrefixes) {
    if (claimOne(p)) claimedPrefixes.push(p);
  }
  visiblePrefixes = claimedPrefixes;
  if (visibleInfix && !claimOne(visibleInfix)) visibleInfix = undefined;
  if (visibleSuffix && !suffixClaimedEarly && !claimOne(visibleSuffix)) visibleSuffix = undefined;
  // Diacritics that inherit color from another component merge into that component's
  // section in formatWordAnalysis (lines 397-428 of colorSegments.ts). If the parent
  // component is still visible, the diacritic shares its claim and rides along. If the
  // parent was filtered out, the diacritic falls back to a fresh color slot — drop it
  // unless it can claim its own English occurrence to keep both sides paired.
  if (visibleDiacritic) {
    const parentStillVisible =
      (visibleDiacritic.inheritColorFrom === ComponentType.SUFFIX && visibleSuffix) ||
      (visibleDiacritic.inheritColorFrom === ComponentType.PREFIX && visiblePrefixes.length > 0) ||
      (visibleDiacritic.inheritColorFrom === ComponentType.INFIX && visibleInfix);
    if (!parentStillVisible && !claimOne(visibleDiacritic)) {
      visibleDiacritic = undefined;
    }
  }

  // Recompute remaining text using only the *visible* components so reconstruction
  // doesn't expand a single prefix to consume the whole word (line 215-217 in
  // colorSegments.ts uses remainingArabic to decide that).
  //
  // When no components were filtered out, reuse the analyzer's already-computed `remaining`
  // — it accounts for hamza-normalization quirks (إ → ا) that a naive startsWith comparison
  // on prefixMatch.arabicMatch can miss.
  const droppedCount =
    finalPrefixes.length -
    visiblePrefixes.length +
    (resolvedSuffix && !visibleSuffix ? 1 : 0) +
    (infix && !visibleInfix ? 1 : 0);
  let visibleRemaining: string;
  if (droppedCount === 0) {
    visibleRemaining = remaining;
  } else {
    visibleRemaining = normalized;
    for (const p of visiblePrefixes) {
      visibleRemaining = visibleRemaining.substring(p.arabicMatch.length);
    }
    if (visibleSuffix) {
      visibleRemaining = visibleRemaining.substring(
        0,
        visibleRemaining.length - visibleSuffix.arabicMatch.length,
      );
    }
  }

  const isStandalone = isSingleStandaloneComponent(
    {
      prefixes: visiblePrefixes,
      suffix: visibleSuffix,
      infix: visibleInfix,
      diacritic: visibleDiacritic,
    },
    normalized,
  );

  // Preserve detected components on the WordAnalysis even when isStandalone — non-render
  // consumers (analytics, debugging, downstream tools) need to see what was actually
  // detected. Render decisions key on `hasComponents`, which is the single visibility flag.
  // The legacy benchmark was rewritten to gate on hasComponents (utils/benchmarkUtils.ts).
  const result: WordAnalysis = {
    original: { arabic, english: normalizedEnglish },
    prefixes: visiblePrefixes,
    infix: visibleInfix,
    suffix: visibleSuffix,
    diacritic: visibleDiacritic,
    hasComponents: isStandalone
      ? false
      : Boolean(visiblePrefixes.length > 0 || visibleInfix || visibleSuffix || visibleDiacritic),
    remainingArabic: visibleRemaining.trim(),
    remainingEnglish,
    hasBracketInjection,
  };

  cacheWithLRUEviction(ANALYSIS_CACHE, cacheKey, result);

  return result;
}

// Dedup set to avoid flooding Sentry with the same word
const reportedMismatches = new Set<string>();

/**
 * Report a color mismatch to Sentry for debugging.
 * Includes full context so we can reproduce and fix the analysis bug.
 */
function reportColorMismatch(
  arabicWord: string,
  english: string,
  segments: ColoredSegment[],
  sections: { type: string; arabicPart?: string; englishPart?: string; colorName?: string }[],
  analysis: WordAnalysis,
): void {
  const key = `${arabicWord}|${english}`;
  if (reportedMismatches.has(key)) return;
  reportedMismatches.add(key);

  try {
    Sentry.withScope(scope => {
      scope.setLevel('warning');
      scope.setTag('component', 'arabicWordAnalysis');
      scope.setTag('issue', 'color-mismatch');
      scope.setExtra('arabicWord', arabicWord);
      scope.setExtra('english', english);
      scope.setExtra(
        'segments',
        segments.map(s => ({ text: s.text, type: s.type, color: s.color })),
      );
      scope.setExtra(
        'sections',
        sections.filter(s => s.type === 'components'),
      );
      scope.setExtra(
        'prefixes',
        analysis.prefixes?.map(p => ({ arabic: p.arabicMatch, role: p.role })),
      );
      scope.setExtra(
        'suffix',
        analysis.suffix
          ? { arabic: analysis.suffix.arabicMatch, role: analysis.suffix.role }
          : null,
      );
      scope.setExtra(
        'diacritic',
        analysis.diacritic
          ? { arabic: analysis.diacritic.arabicMatch, role: analysis.diacritic.role }
          : null,
      );
      scope.setExtra('remainingArabic', analysis.remainingArabic);
      Sentry.captureMessage(`Color mismatch: "${arabicWord}" (${english})`);
    });
  } catch {
    // Sentry unavailable — silently continue
  }
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
  const processedEnglish = shouldInjectBracket(normalizedArabic, englishTranslation, arabicWord)
    ? `[the] ${englishTranslation}`
    : englishTranslation;

  // Analyze word (single-word check happens inside analyzeArabicWord now)
  const analysis = analyzeArabicWord(arabicWord, processedEnglish);

  // Return plain text if no components found (includes single-word case)
  if (!analysis?.hasComponents) {
    return [{ text: arabicWord, color: colors.arabicText, type: 'root' as const }];
  }

  const plain = [{ text: arabicWord, color: colors.arabicText, type: 'root' as const }];

  const formatted = formatWordAnalysis(analysis);
  if (!formatted?.reconstructedArabic) {
    return plain;
  }

  // Resolve segment colors
  const segments = formatted.reconstructedArabic.segments.map(segment => ({
    text: segment.text,
    color: resolveColorName(segment.colorName, colors),
    type: segment.type as ColoredSegment['type'],
  }));

  // Skip coloring when the word is a single colored segment with no breakdown.
  // Example: "لَا" = 1 prefix segment covering the entire word → nothing to learn from coloring.
  // This does NOT affect multi-segment words like "فِيهِ" (prefix + suffix = 2 segments).
  if (segments.length === 1 && segments[0]?.type !== 'root') {
    return plain;
  }

  // Safety net: the number of distinct non-default colors in Arabic must match
  // the number of English component sections. An inherited diacritic shares its
  // parent's color, so it doesn't add a new distinct color — just reinforces the same one.
  const defaultColors = new Set([colors.arabicText, colors.text]);
  const distinctArabicColors = new Set(
    segments.map(s => s.color).filter(c => !defaultColors.has(c)),
  ).size;
  const englishComponentCount = formatted.sections.filter(s => s.type === 'components').length;

  if (distinctArabicColors !== englishComponentCount) {
    reportColorMismatch(arabicWord, englishTranslation, segments, formatted.sections, analysis);
    return plain;
  }

  return segments;
}
