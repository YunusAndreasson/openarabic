import { CONTRACTION_EXPANSIONS, EXPANSION_TO_CONTRACTION } from '@/constants/contractions';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import type { WordAnalysis } from '@/utils/arabicWordAnalysis';

// Helper type for formatted analysis result
type FormattedAnalysis = ReturnType<typeof formatWordAnalysis>;

/**
 * Pre-compiled regex for word boundary detection
 * Matches lowercase ASCII letters a-z
 * Note: Intentionally limited to ASCII for English text matching (Arabic text handled separately)
 */
const LETTER_REGEX = /[a-z]/;

/**
 * Check if a character is a non-letter (word boundary)
 */
const isNonLetter = (ch: string): boolean => !LETTER_REGEX.test(ch);

/**
 * Determine if color-coding should be applied to text
 * Single words should never have grammar color-coding
 *
 * @param text - The text to check
 * @returns true if color-coding should be applied
 */
export const shouldApplyColorCoding = (text: string): boolean => {
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount > 1;
};

export interface ColoredTextSegment {
  text: string;
  color: string;
  key: string;
}

export interface ColorCodedTextOptions {
  /** The text to color-code */
  text: string;
  /** Formatted analysis from Arabic word analysis */
  formattedAnalysis: FormattedAnalysis | null;
  /** Raw analysis for bracket injection check */
  analysis: WordAnalysis | null;
  /** Theme colors object */
  colors: ThemeColors;
  /** Default color for non-matched text */
  defaultColor: string;
}

/**
 * Generate color-coded text segments for rendering
 * Shared logic between WordTooltip and WordDetailsBottomSheet
 *
 * @param options - Color coding options
 * @returns Array of text segments with colors
 */
export const generateColorCodedSegments = ({
  text,
  formattedAnalysis,
  analysis,
  colors,
  defaultColor,
}: ColorCodedTextOptions): ColoredTextSegment[] => {
  // No formattedAnalysis available
  if (!formattedAnalysis?.sections?.length) {
    return [{ text, color: defaultColor, key: 'no-analysis' }];
  }

  // Get the displayed text (may include bracket injection)
  const displayedText =
    formattedAnalysis.sections.find((s: { type: string }) => s.type === 'original')?.content ||
    text;

  // CRITICAL: Single-word rule - applies even if analysis is null (test scenario)
  // Single words should never have grammar color-coding for educational clarity
  if (!shouldApplyColorCoding(displayedText)) {
    return [{ text: displayedText, color: defaultColor, key: 'single-word' }];
  }

  // No analysis available or no components found
  // analyzeArabicWord() now handles single-word check, so we just trust hasComponents
  // Note: Some tests pass analysis=null with manual formattedAnalysis, so check both
  const hasComponentSections = formattedAnalysis.sections.some(
    (s: { type: string }) => s.type === 'components',
  );
  if ((!analysis?.hasComponents && analysis !== null) || !hasComponentSections) {
    return [{ text: displayedText, color: defaultColor, key: 'no-components' }];
  }

  const componentSections = formattedAnalysis.sections.filter(
    (s: { type: string }) => s.type === 'components',
  );

  // No components found
  if (!componentSections.length) {
    return [{ text: displayedText, color: defaultColor, key: 'no-components' }];
  }

  const matchPositions: {
    start: number;
    end: number;
    color: string;
    componentType?: string;
    isBracketInjection?: boolean;
  }[] = [];

  /**
   * Score a match based on component type and position in text
   * Prefixes score higher at START, suffixes score higher at END
   */
  const getPositionalScore = (
    match: { start: number; end: number; componentType?: string },
    textLength: number,
  ): number => {
    // Bracket injection always has highest priority at start
    if (match.componentType === 'bracket') return 2.0;

    if (!match.componentType || textLength === 0) return 0.5;

    const relativePosition = match.start / textLength;

    if (match.componentType === 'prefix') {
      // Prefixes score higher at start: 1.0 at position 0 → 0.0 at end
      return 1 - relativePosition;
    } else if (match.componentType === 'suffix') {
      // Suffixes score higher at end: 0.0 at position 0 → 1.0 at end
      return relativePosition;
    }
    // Neutral score for infix/diacritic (can appear anywhere)
    return 0.5;
  };

  // Add bracket color coding for [the] injection
  // Display as "the" without brackets in the colored segment
  if (analysis?.hasBracketInjection) {
    const bracketMatch = displayedText.match(/^\[the\]/);
    if (bracketMatch) {
      matchPositions.push({
        start: 0,
        end: 5, // "[the]" length (5 characters including brackets)
        color: colors.tint, // Use tint color for definite article
        componentType: 'bracket', // Special type for bracket injection
        isBracketInjection: true, // Flag to remove brackets when displaying
      });
    }
  }

  // Build color mapping - includes all theme colors that might be referenced
  const colorMapping: Record<string, string> = {
    // Core UI colors
    tint: colors.tint,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    secondaryText: colors.secondaryText,
    border: colors.border,

    // Semantic colors
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    accent: colors.accent,
    violet: colors.violet,
    indigo: colors.indigo,
    coral: colors.coral,

    // Text colors
    arabicText: colors.arabicText,
    englishText: colors.englishText,

    // Grammar colors - dedicated educational palette
    'grammar.preposition': colors.grammar.preposition,
    'grammar.possessive': colors.grammar.possessive,
    'grammar.particle': colors.grammar.particle,
    'grammar.interrogative': colors.grammar.interrogative,
    'grammar.verbConjugation': colors.grammar.verbConjugation,
    'grammar.negation': colors.grammar.negation,
    'grammar.subjectPrefix': colors.grammar.subjectPrefix,
    'grammar.plural': colors.grammar.plural,
    'grammar.demonstrative': colors.grammar.demonstrative,
    'grammar.conjunction': colors.grammar.conjunction,
    'grammar.futureTense': colors.grammar.futureTense,
    'grammar.definiteArticle': colors.grammar.definiteArticle,
  };

  // Icon to component type mapping
  const iconToComponentType: Record<string, string> = {
    '→': 'prefix',
    '←': 'suffix',
    '↔': 'infix',
    '◌': 'diacritic',
  };

  // Process each component section
  for (const section of componentSections) {
    if (!section.englishPart) continue;

    const searchText = displayedText.toLowerCase();
    const colorKey = section.colorName as keyof typeof colorMapping;
    const colorValue = colorMapping[colorKey] || colors.text;

    // Detect component type from icon (→ = prefix, ← = suffix, ↔ = infix, ◌ = diacritic)
    const componentType = section.icon ? iconToComponentType[section.icon] : undefined;

    // Split possible multiple english matches like "his / its / it"
    // Also split compound patterns like "and the" into individual words
    const baseCandidates = section.englishPart
      .toLowerCase()
      .split('/')
      .flatMap(s => {
        const trimmed = s.trim();
        // Split space-separated compound patterns into individual words
        // BUT keep compound intact if it's a potential contraction target (e.g., "do not")
        if (trimmed.includes(' ')) {
          // Check if this compound is a contraction expansion (e.g., "do not" from "don't")
          // O(1) lookup using pre-computed Set
          const isContractionExpansion = CONTRACTION_EXPANSIONS.has(trimmed);

          if (isContractionExpansion) {
            // Keep compound for contraction matching (e.g., "do not" → matches "don't")
            return [trimmed];
          } else {
            // Split into individual words for separate coloring (e.g., "and the" → ["and", "the"])
            return trimmed.split(/\s+/);
          }
        }
        return [trimmed];
      })
      .filter(Boolean);

    // Expand candidates to include contracted forms
    // e.g., "do not" should also match "don't"
    const candidates: string[] = [];
    for (const candidate of baseCandidates) {
      candidates.push(candidate);
      // Check if this candidate has a contracted form
      // O(1) lookup using pre-computed reverse Map
      const contractedForm = EXPANSION_TO_CONTRACTION.get(candidate);
      if (contractedForm) {
        candidates.push(contractedForm);
      }
    }

    // Track duplicates (start:end) to avoid overlapping duplicates
    const seen = new Set<string>();
    for (const candidate of candidates) {
      let fromIndex = 0;
      while (fromIndex <= searchText.length) {
        const idx = searchText.indexOf(candidate, fromIndex);
        if (idx === -1) break;

        const prevChar = idx > 0 ? (searchText[idx - 1] ?? ' ') : ' ';
        const nextIdx = idx + candidate.length;
        const nextChar = nextIdx < searchText.length ? (searchText[nextIdx] ?? ' ') : ' ';
        const isValidMatch =
          idx === 0 ||
          isNonLetter(prevChar) ||
          nextIdx === searchText.length ||
          isNonLetter(nextChar);

        if (isValidMatch) {
          const key = `${idx}:${idx + candidate.length}`;
          if (!seen.has(key)) {
            seen.add(key);
            matchPositions.push({
              start: idx,
              end: idx + candidate.length,
              color: colorValue,
              componentType, // Store component type for positional scoring
            });
          }
          // Move past this match to find further non-overlapping matches
          fromIndex = idx + candidate.length;
        } else {
          fromIndex = idx + 1;
        }
      }
    }
  }

  // Sort and filter overlapping matches using positional scoring
  // When matches overlap, keep the one with the highest positional score
  const textLength = displayedText.length;
  const sortedByPosition = [...matchPositions].sort((a, b) => a.start - b.start);

  const selectedMatches: typeof matchPositions = [];
  let i = 0;

  while (i < sortedByPosition.length) {
    const current = sortedByPosition[i];
    if (!current) break;

    // Find all matches that overlap with current
    const overlapping = [current];
    let j = i + 1;

    while (j < sortedByPosition.length) {
      const next = sortedByPosition[j];
      if (!next || next.start >= current.end) break; // No overlap
      overlapping.push(next);
      j++;
    }

    // If multiple matches overlap, choose the one with highest positional score
    if (overlapping.length > 1) {
      const bestMatch = overlapping.reduce((best, match) => {
        const bestScore = getPositionalScore(best, textLength);
        const matchScore = getPositionalScore(match, textLength);
        return matchScore > bestScore ? match : best;
      });
      selectedMatches.push(bestMatch);
      // Skip all overlapping matches
      i = j;
    } else {
      selectedMatches.push(current);
      i++;
    }
  }

  const sortedMatches = selectedMatches.sort((a, b) => a.start - b.start);

  // Build final segments
  const parts: ColoredTextSegment[] = [];
  let currentIndex = 0;

  for (const match of sortedMatches) {
    if (match.start > currentIndex) {
      parts.push({
        text: displayedText.substring(currentIndex, match.start),
        color: defaultColor,
        key: `text-${currentIndex}`,
      });
    }

    // Get the matched text
    let matchedText = displayedText.substring(match.start, match.end);

    // Remove brackets from bracket injection matches (display "the" instead of "[the]")
    if (match.isBracketInjection && matchedText.startsWith('[') && matchedText.endsWith(']')) {
      matchedText = matchedText.slice(1, -1); // Remove [ and ]
    }

    parts.push({
      text: matchedText,
      color: match.color,
      key: `match-${match.start}`,
    });
    currentIndex = match.end;
  }

  if (currentIndex < displayedText.length) {
    parts.push({
      text: displayedText.substring(currentIndex),
      color: defaultColor,
      key: 'remaining',
    });
  }

  return parts;
};
