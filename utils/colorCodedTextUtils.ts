import type { ThemeColors } from '@/types/ui/theme.types';
import type { formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import type { WordAnalysis } from '@/utils/arabicWordAnalysis';

// Helper type for formatted analysis result
type FormattedAnalysis = ReturnType<typeof formatWordAnalysis>;

/**
 * Centralized color mapping for grammar component coloring
 * Used across WordTooltip, WordDetailsBottomSheet, and other components
 */
export const GRAMMAR_COLOR_MAP = {
  tint: 'tint',
  primary: 'primary',
  warning: 'warning',
  secondaryText: 'secondaryText',
  text: 'text',
} as const;

/**
 * Pre-compiled regex for word boundary detection
 * More efficient than creating new regex on every check
 */
const LETTER_REGEX = /[a-z]/;

/**
 * Common English contractions mapped to their expanded forms
 * Used to match contracted text against expanded component patterns
 */
const CONTRACTION_MAP: Record<string, string> = {
  "won't": 'will not',
  "can't": 'cannot',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "hadn't": 'had not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "couldn't": 'could not',
};

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
  // No analysis available
  if (!formattedAnalysis?.sections?.length) {
    return [{ text, color: defaultColor, key: 'no-analysis' }];
  }

  // Get the displayed text (may include bracket injection)
  const displayedText =
    formattedAnalysis.sections.find((s: { type: string }) => s.type === 'original')?.content ||
    text;

  // Single words should never have grammar color-coding
  // CRITICAL: Check displayedText (with brackets) not original text parameter
  if (!shouldApplyColorCoding(displayedText)) {
    return [{ text: displayedText, color: defaultColor, key: 'single-word' }];
  }

  const componentSections = formattedAnalysis.sections.filter(
    (s: { type: string }) => s.type === 'components'
  );

  // No components found
  if (!componentSections.length) {
    return [{ text: displayedText, color: defaultColor, key: 'no-components' }];
  }

  const matchPositions: { start: number; end: number; color: string }[] = [];

  // Add bracket color coding for [the] injection
  if (analysis?.hasBracketInjection) {
    const bracketMatch = displayedText.match(/^\[the\]/);
    if (bracketMatch) {
      matchPositions.push({
        start: 0,
        end: 5, // "[the]" length (5 characters)
        color: colors.tint, // Use tint color for brackets
      });
    }
  }

  // Build color mapping
  const colorMapping: Record<string, string> = {
    tint: colors.tint,
    primary: colors.primary,
    warning: colors.warning,
    secondaryText: colors.secondaryText,
    text: colors.text,
  };

  // Process each component section
  for (const section of componentSections) {
    if (!section.englishPart) continue;

    const searchText = displayedText.toLowerCase();
    const colorKey = section.colorName as keyof typeof colorMapping;
    const colorValue = colorMapping[colorKey] || colors.text || '#000000';

    // Split possible multiple english matches like "his / its / it"
    const baseCandidates = section.englishPart
      .toLowerCase()
      .split('/')
      .map(s => s.trim())
      .filter(Boolean);

    // Expand candidates to include contracted forms
    // e.g., "do not" should also match "don't"
    const candidates: string[] = [];
    for (const candidate of baseCandidates) {
      candidates.push(candidate);
      // Check if this candidate has a contracted form
      const contractedForm = Object.keys(CONTRACTION_MAP).find(
        key => CONTRACTION_MAP[key] === candidate
      );
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

        const prevChar = idx > 0 ? searchText[idx - 1] ?? ' ' : ' ';
        const nextIdx = idx + candidate.length;
        const nextChar = nextIdx < searchText.length ? searchText[nextIdx] ?? ' ' : ' ';
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

  // Sort and filter overlapping matches
  const sortedMatches = matchPositions
    .sort((a, b) => a.start - b.start)
    .filter((match, i, arr) => i === 0 || match.start >= (arr[i - 1]?.end ?? 0));

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
    parts.push({
      text: displayedText.substring(match.start, match.end),
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

/**
 * Create color mapping object from theme colors
 * Memoization helper for components
 */
export const createColorMapping = (colors: ThemeColors) => ({
  tint: colors.tint,
  primary: colors.primary,
  warning: colors.warning,
  secondaryText: colors.secondaryText,
  text: colors.text,
});
