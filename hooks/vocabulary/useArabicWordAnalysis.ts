import { useMemo } from 'react';

import { useColors } from '@/hooks/theme/useColors';
import {
  analyzeArabicWord,
  formatWordAnalysis,
  normalizeArabic,
  shouldInjectBracket,
} from '@/utils/arabicWordAnalysis';

interface ColoredSegment {
  text: string;
  color: string;
  type: 'prefix' | 'infix' | 'suffix' | 'diacritic' | 'root';
}

interface UseArabicWordAnalysisResult {
  /** Whether the word has analyzable components */
  hasComponents: boolean;
  /** Colored segments for rendering */
  coloredSegments: ColoredSegment[];
  /** Original analysis for detailed information */
  analysis: ReturnType<typeof analyzeArabicWord> | null;
  /** Formatted analysis for tooltip display */
  formattedAnalysis: ReturnType<typeof formatWordAnalysis> | null;
}

/**
 * Valid color names for Arabic word analysis segments
 * These must match the keys in the colorMap
 */
type ValidColorName = 'tint' | 'primary' | 'secondary' | 'warning' | 'accent' | 'error' | 'text';

/**
 * Type guard to validate color names
 * CRITICAL: This function throws an error if the color name is invalid
 * NO DEFAULT FALLBACK - we want to catch invalid color names immediately
 */
function assertValidColorName(colorName: string): asserts colorName is ValidColorName {
  const validColors: ValidColorName[] = ['tint', 'primary', 'secondary', 'warning', 'accent', 'error', 'text'];

  if (!validColors.includes(colorName as ValidColorName)) {
    throw new Error(
      `Invalid color name "${colorName}" in Arabic word analysis. ` +
      `Valid colors are: ${validColors.join(', ')}. ` +
      `This indicates a bug in the word analysis logic that must be fixed.`
    );
  }
}

/**
 * Hook for analyzing Arabic words and providing color-coded segments
 * Memoizes results for performance and provides theme-aware colors
 */
export function useArabicWordAnalysis(
  arabicWord: string,
  englishTranslation: string,
  enabled = true,
): UseArabicWordAnalysisResult {
  const colors = useColors();

  // Memoize the analysis to prevent unnecessary recalculations
  const analysis = useMemo(() => {
    if (!enabled || !arabicWord || !englishTranslation) {
      return null;
    }

    // Normalize Arabic for bracket injection check (uses shared normalizeArabic with caching)
    const normalizedArabicWord = normalizeArabic(arabicWord);

    // Use shared bracket injection logic
    const hasBracketInjection = shouldInjectBracket(normalizedArabicWord, englishTranslation);

    // Inject "[the]" for Arabic words with definite article when appropriate
    // This helps users learn that "ال" = "the" even when not explicitly translated
    const processedEnglish = hasBracketInjection
      ? `[the] ${englishTranslation}`
      : englishTranslation;

    // Analyze word (single-word check happens inside analyzeArabicWord now)
    // analyzeArabicWord already returns hasBracketInjection in the result
    return analyzeArabicWord(arabicWord, processedEnglish);
  }, [arabicWord, englishTranslation, enabled]);

  // Memoize the formatted analysis
  const formattedAnalysis = useMemo(() => {
    if (!analysis?.hasComponents) {
      return null;
    }
    return formatWordAnalysis(analysis);
  }, [analysis]);

  // Create color mapping - only includes colors that are actually used by word analysis
  const colorMap = useMemo(
    () => ({
      tint: colors.tint,
      primary: colors.primary,
      secondary: colors.secondary,
      warning: colors.warning,
      accent: colors.accent,
      error: colors.error,
      text: colors.text,
    }),
    [
      colors.tint,
      colors.primary,
      colors.secondary,
      colors.warning,
      colors.accent,
      colors.error,
      colors.text,
    ],
  );

  // Convert analysis to colored segments
  const coloredSegments = useMemo((): ColoredSegment[] => {
    if (!analysis?.hasComponents || !formattedAnalysis?.reconstructedArabic) {
      // Return single segment with default color if no components
      return [
        {
          text: arabicWord,
          color: colors.text,
          type: 'root',
        },
      ];
    }

    const { segments } = formattedAnalysis.reconstructedArabic;

    return segments.map(segment => {
      // CRITICAL: Validate color name with strict type guard
      // This will throw an error if colorName is invalid - NO FALLBACK
      assertValidColorName(segment.colorName);

      return {
        text: segment.text,
        color: colorMap[segment.colorName],
        type: segment.type as ColoredSegment['type'],
      };
    });
  }, [analysis, formattedAnalysis, arabicWord, colors.text, colorMap]);

  return {
    hasComponents: analysis?.hasComponents ?? false,
    coloredSegments,
    analysis,
    formattedAnalysis,
  };
}
